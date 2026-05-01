import { createHash, randomInt, randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DEMO_USERS } from './constants/demo-users.constant';
import { DemoLoginDto } from './dto/demo-login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPhoneCodeDto } from './dto/request-phone-code.dto';
import { VerifyPhoneCodeDto } from './dto/verify-phone-code.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
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
      throw new UnauthorizedException('Неверный или просроченный код подтверждения.');
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
        throw new UnauthorizedException('Стартовые роли еще не созданы через seed.');
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
      throw new UnauthorizedException('Refresh-сессия недействительна.');
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
      return { loggedOut: true };
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
      return { loggedOut: true };
    }

    return { loggedOut: true };
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

  async demoLogin(dto: DemoLoginDto) {
    if (!this.configService.get<boolean>('auth.enableDemoLogin', true)) {
      throw new AppError(HttpStatus.FORBIDDEN, {
        code: ERROR_CODES.demoAuthDisabled,
        message: 'Демо-вход отключен в текущем окружении.',
      });
    }

    const demoUser = DEMO_USERS[dto.userKey];

    const user = await this.prisma.user.findUnique({
      where: { phone: demoUser.phone },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        settings: true,
      },
    });

    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.demoUserNotFound,
        message: `Демо-пользователь ${dto.userKey} не найден. Сначала выполните seed.`,
      });
    }

    return {
      ...(await this.issueTokens(user.id, user.phone, user.roles.map((entry) => entry.role.key))),
      demoUser: {
        key: dto.userKey,
        phone: user.phone,
        roles: user.roles.map((entry) => entry.role.key),
      },
    };
  }

  private async issueTokens(userId: string, phone: string, roles: string[], existingSessionId?: string) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, phone, roles },
      {
        secret: this.configService.getOrThrow<string>('auth.accessSecret'),
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
