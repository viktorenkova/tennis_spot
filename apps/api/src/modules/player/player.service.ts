import {
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePlayerProfileDto } from './dto/create-player-profile.dto';
import { UpdatePlayerPreferencesDto } from './dto/update-player-preferences.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { UpdatePlayerVisibilityDto } from './dto/update-player-visibility.dto';

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  getMyProfile(userId: string) {
    return this.prisma.playerProfile.findUnique({
      where: { userId },
      include: {
        city: true,
        district: true,
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
      throw new ConflictException('Player profile already exists.');
    }

    return this.prisma.playerProfile.create({
      data: {
        userId,
        status: 'draft',
        ...dto,
        visibilitySettings: {
          create: {},
        },
        playPreferences: {
          create: {},
        },
      },
      include: {
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

  updateAvatar() {
    throw new NotImplementedException(
      'Avatar upload is reserved for the future S3-backed files module boundary.',
    );
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
      },
    });

    if (!player) {
      throw new NotFoundException('Player profile not found.');
    }

    return player;
  }

  private async ensureProfile(userId: string) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Player profile not found.');
    }

    return profile;
  }
}
