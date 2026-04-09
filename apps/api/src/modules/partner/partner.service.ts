import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreatePartnerProfileDto) {
    const existing = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (existing) {
      throw new ConflictException('Partner profile already exists.');
    }

    const partnerRole = await this.prisma.role.findUnique({
      where: { key: 'partner' },
    });

    if (!partnerRole) {
      throw new NotFoundException('Partner role is not seeded yet.');
    }

    return this.prisma.$transaction(async (tx) => {
      const typeRecords = [];

      for (const key of dto.partnerTypes) {
        const partnerType = await tx.partnerType.findUnique({
          where: { key },
        });

        if (!partnerType) {
          throw new NotFoundException(`Partner type ${key} is not seeded.`);
        }

        typeRecords.push({ partnerTypeId: partnerType.id });
      }

      const profile = await tx.partnerProfile.create({
        data: {
          ownerUserId: userId,
          legalName: dto.legalName,
          brandName: dto.brandName,
          description: dto.description,
          cityId: dto.cityId,
          districtId: dto.districtId,
          profileTypes: {
            create: typeRecords,
          },
        },
        include: {
          profileTypes: {
            include: {
              partnerType: true,
            },
          },
          contacts: true,
        },
      });

      const existingRole = await tx.userRole.findFirst({
        where: {
          userId,
          roleId: partnerRole.id,
        },
      });

      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId,
            roleId: partnerRole.id,
          },
        });
      }

      return profile;
    });
  }

  getMyProfile(userId: string) {
    return this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
      include: {
        city: true,
        district: true,
        profileTypes: {
          include: {
            partnerType: true,
          },
        },
        contacts: true,
      },
    });
  }

  async updateMyProfile(userId: string, dto: UpdatePartnerProfileDto) {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (!profile) {
      throw new NotFoundException('Partner profile not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.partnerTypes) {
        await tx.partnerProfileType.deleteMany({
          where: {
            partnerProfileId: profile.id,
          },
        });

        for (const key of dto.partnerTypes) {
          const partnerType = await tx.partnerType.findUnique({
            where: { key },
          });

          if (!partnerType) {
            throw new NotFoundException(`Partner type ${key} is not seeded.`);
          }

          await tx.partnerProfileType.create({
            data: {
              partnerProfileId: profile.id,
              partnerTypeId: partnerType.id,
            },
          });
        }
      }

      return tx.partnerProfile.update({
        where: { ownerUserId: userId },
        data: {
          legalName: dto.legalName,
          brandName: dto.brandName,
          description: dto.description,
          cityId: dto.cityId,
          districtId: dto.districtId,
        },
        include: {
          city: true,
          district: true,
          profileTypes: {
            include: {
              partnerType: true,
            },
          },
          contacts: true,
        },
      });
    });
  }

  listPartners() {
    return this.prisma.partnerProfile.findMany({
      where: {
        verificationStatus: 'verified',
      },
      include: {
        city: true,
        district: true,
        profileTypes: {
          include: {
            partnerType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPartnerById(partnerId: string) {
    const partner = await this.prisma.partnerProfile.findUnique({
      where: { id: partnerId },
      include: {
        city: true,
        district: true,
        profileTypes: {
          include: {
            partnerType: true,
          },
        },
        contacts: true,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner profile not found.');
    }

    return partner;
  }
}
