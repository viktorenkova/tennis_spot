import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePartnerProfileDto } from './dto/create-partner-profile.dto';
import { UpdatePartnerProfileDto } from './dto/update-partner-profile.dto';

const publicPartnerSelect = Prisma.validator<Prisma.PartnerProfileSelect>()({
  id: true,
  legalName: true,
  brandName: true,
  description: true,
  contactPhone: true,
  contactEmail: true,
  verificationStatus: true,
  city: true,
  district: true,
  profileTypes: {
    include: {
      partnerType: true,
    },
  },
  contacts: {
    select: {
      id: true,
      type: true,
      value: true,
      label: true,
      isPrimary: true,
    },
  },
});

@Injectable()
export class PartnerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreatePartnerProfileDto) {
    const existing = await this.prisma.partnerProfile.findUnique({
      where: { ownerUserId: userId },
    });

    if (existing) {
      throw new ConflictException('Профиль партнера уже существует.');
    }

    const partnerRole = await this.prisma.role.findUnique({
      where: { key: 'partner' },
    });

    if (!partnerRole) {
      throw new NotFoundException('Роль партнера еще не создана через seed.');
    }

    return this.prisma.$transaction(async (tx) => {
      const typeRecords = [];

      for (const key of dto.partnerTypes) {
        const partnerType = await tx.partnerType.findUnique({
          where: { key },
        });

        if (!partnerType) {
          throw new NotFoundException(`Тип партнера ${key} еще не создан через seed.`);
        }

        typeRecords.push({ partnerTypeId: partnerType.id });
      }

      const profile = await tx.partnerProfile.create({
        data: {
          ownerUserId: userId,
          legalName: dto.legalName,
          brandName: dto.brandName,
          description: dto.description,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          taxId: dto.taxId,
          legalAddress: dto.legalAddress,
          actualAddress: dto.actualAddress,
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
      throw new NotFoundException('Профиль партнера не найден.');
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
            throw new NotFoundException(`Тип партнера ${key} еще не создан через seed.`);
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
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          taxId: dto.taxId,
          legalAddress: dto.legalAddress,
          actualAddress: dto.actualAddress,
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
      select: publicPartnerSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPartnerById(partnerId: string) {
    const partner = await this.prisma.partnerProfile.findFirst({
      where: {
        id: partnerId,
        verificationStatus: 'verified',
      },
      select: publicPartnerSelect,
    });

    if (!partner) {
      throw new NotFoundException('Профиль партнера не найден.');
    }

    return partner;
  }
}
