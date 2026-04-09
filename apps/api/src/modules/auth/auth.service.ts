import { createHash, randomInt, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPhoneCodeDto } from './dto/request-phone-code.dto';
import { VerifyPhoneCodeDto } from './dto/verify-phone-code.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async requestPhoneCode(dto: RequestPhoneCodeDto) {
    const phone = this.normalizePhone(dto.phone);
    const code = this.generateCode();
    const codeHash = this.hashValue(code);
    const ttlMinutes = this.configService.get<number>('auth.phoneCodeTtlMinutes', 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const challenge = await this.prisma.authPhoneChallenge.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });

    return {
      challengeId: challenge.id,
      phone,
      expiresAt,
      delivery: 'development',
      ...(this.configService.get<boolean>('auth.returnDevCode', false) ? { code } : {}),
    };
  }

  async verifyPhoneCode(dto: VerifyPhoneCodeDto) {
    const phone = this.normalizePhone(dto.phone);
    const challenge = await this.prisma.authPhoneChallenge.findFirst({
      where: {
        id: dto.challengeId,
        phone,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!challenge || challenge.codeHash !== this.hashValue(dto.code)) {
      throw new UnauthorizedException('Invalid or expired verification code.');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.authPhoneChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      const existingUser = await tx.user.findUnique({
        where: { phone },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          settings: true,
        },
      });

      if (existingUser) {
        if (!existingUser.settings) {
          await tx.userSetting.create({
            data: { userId: existingUser.id },
          });
        }

        return existingUser;
      }

      const playerRole = await tx.role.findUnique({
        where: { key: 'player' },
      });

      if (!playerRole) {
        throw new UnauthorizedException('Starter roles are not seeded yet.');
      }

      return tx.user.create({
        data: {
          phone,
          status: 'active',
          settings: {
            create: {},
          },
          roles: {
            create: {
              roleId: playerRole.id,
            },
          },
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          settings: true,
        },
      });
    });

    return this.issueTokens(user.id, user.phone, user.roles.map((entry) => entry.role.key));
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      sid: string;
      phone: string;
      roles: string[];
    }>(dto.refreshToken, {
      secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
    });

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sid },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.revokedAt || session.refreshTokenHash !== this.hashValue(dto.refreshToken)) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    return this.issueTokens(
      session.user.id,
      session.user.phone,
      session.user.roles.map((entry) => entry.role.key),
      session.id,
    );
  }

  async logout(dto: LogoutDto) {
    if (!dto.refreshToken) {
      return { success: true };
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sid: string }>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
      });

      await this.prisma.userSession.updateMany({
        where: {
          id: payload.sid,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch {
      return { success: true };
    }

    return { success: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        settings: true,
      },
    });
  }

  private async issueTokens(userId: string, phone: string, roles: string[], existingSessionId?: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, phone, roles },
      {
        secret: this.configService.get<string>('auth.accessSecret'),
        expiresIn: this.configService.getOrThrow<string>('auth.accessTtl') as StringValue,
      },
    );

    const sessionId = existingSessionId ?? randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, phone, roles, sid: sessionId },
      {
        secret: this.configService.getOrThrow<string>('auth.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>('auth.refreshTtl') as StringValue,
      },
    );

    await this.prisma.userSession.upsert({
      where: { id: sessionId },
      update: {
        refreshTokenHash: this.hashValue(refreshToken),
        revokedAt: null,
        expiresAt: this.createRefreshExpiryDate(),
      },
      create: {
        id: sessionId,
        userId,
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: this.createRefreshExpiryDate(),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }

  private createRefreshExpiryDate() {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  private generateCode() {
    const length = this.configService.get<number>('auth.phoneCodeLength', 4);
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    return String(randomInt(min, max));
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private normalizePhone(phone: string) {
    return phone.replace(/[^\d+]/g, '');
  }
}
