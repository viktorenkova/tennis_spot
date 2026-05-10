import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerAvatarDto } from './dto/update-player-avatar.dto';
import { UpdatePlayerPreferencesDto } from './dto/update-player-preferences.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { UpdatePlayerVisibilityDto } from './dto/update-player-visibility.dto';

@Injectable()
export class PlayerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getMyProfile(userId: string) {
    return this.prisma.playerProfile.findUnique({
      where: { userId },
      include: {
        city: true,
        district: true,
        avatarFile: true,
        visibilitySettings: true,
        playPreferences: true,
      },
    });
  }

  async createProfile(userId: string, dto: CreatePlayerProfileDto) {
    const existing = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Профиль игрока уже существует.');
    }

    return this.prisma.playerProfile.create({
      data: {
        userId,
        status: 'active',
        ...dto,
        visibilitySettings: {
          create: {},
        },
        playPreferences: {
          create: {},
        },
      },
      include: {
        avatarFile: true,
        visibilitySettings: true,
        playPreferences: true,
      },
    });
  }

  async updateMyProfile(userId: string, dto: UpdatePlayerProfileDto) {
    await this.ensureProfile(userId);

    return this.prisma.playerProfile.update({
      where: { userId },
      data: dto,
      include: {
        avatarFile: true,
        visibilitySettings: true,
        playPreferences: true,
      },
    });
  }

  async updateVisibility(userId: string, dto: UpdatePlayerVisibilityDto) {
    const profile = await this.ensureProfile(userId);

    return this.prisma.playerVisibilitySetting.upsert({
      where: { playerProfileId: profile.id },
      update: dto,
      create: {
        playerProfileId: profile.id,
        ...dto,
      },
    });
  }

  async updatePreferences(userId: string, dto: UpdatePlayerPreferencesDto) {
    const profile = await this.ensureProfile(userId);

    return this.prisma.playerPlayPreference.upsert({
      where: { playerProfileId: profile.id },
      update: dto,
      create: {
        playerProfileId: profile.id,
        ...dto,
      },
    });
  }

  async updateAvatar(userId: string, dto: UpdatePlayerAvatarDto) {
    await this.ensureProfile(userId);

    return this.prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          originalName: dto.originalName,
          storageBucket: 'pending',
          storageKey: dto.storageKey,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          uploadedByUserId: userId,
        },
      });

      return tx.playerProfile.update({
        where: { userId },
        data: {
          avatarFileId: file.id,
        },
        include: {
          city: true,
          district: true,
          avatarFile: true,
          visibilitySettings: true,
          playPreferences: true,
        },
      });
    });
  }

  listPlayers() {
    return this.prisma.playerProfile.findMany({
      where: {
        status: 'active',
        visibilitySettings: {
          is: {
            profileVisibleToAuthenticated: true,
          },
        },
      },
      include: {
        city: true,
        district: true,
        avatarFile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPlayerById(playerId: string) {
    const player = await this.prisma.playerProfile.findFirst({
      where: {
        id: playerId,
        status: 'active',
        visibilitySettings: {
          is: {
            profileVisibleToAuthenticated: true,
          },
        },
      },
      include: {
        city: true,
        district: true,
        avatarFile: true,
      },
    });

    if (!player) {
      throw new NotFoundException('Профиль игрока не найден.');
    }

    return player;
  }

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Профиль игрока не найден.');
    }

    return profile;
  }
}
