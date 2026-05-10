import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Сессия недействительна.');
    }

    return {
      ...payload,
      phone: user.phone,
      roles: user.roles.map((entry) => entry.role.key),
    };
  }
}
