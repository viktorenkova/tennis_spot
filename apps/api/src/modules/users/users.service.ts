import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getAccount(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  updateAccount(userId: string, dto: UpdateUserAccountDto) {
    return this.prisma.user
      .update({
        where: { id: userId },
        data: {
          email: dto.email,
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Пользователь с таким email уже существует.');
        }

        throw error;
      });
  }

  async getSettings(userId: string) {
    const settings = await this.prisma.userSetting.findUnique({
      where: { userId },
    });

    if (settings) {
      return settings;
    }

    return this.prisma.userSetting.create({
      data: { userId },
    });
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    return this.prisma.userSetting.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });
  }
}
