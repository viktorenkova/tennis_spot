import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { ListPublicVenuesQueryDto } from './dto/list-public-venues-query.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

const privateVenueInclude = Prisma.validator<Prisma.VenueInclude>()({
  address: {
    include: {
      city: true,
      district: true,
    },
  },
  courts: {
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  },
});

const publicVenueInclude = Prisma.validator<Prisma.VenueInclude>()({
  address: privateVenueInclude.address,
  courts: {
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  },
  partnerProfile: {
    include: {
      profileTypes: {
        include: {
          partnerType: true,
        },
      },
    },
  },
});

type PrivateVenuePayload = Prisma.VenueGetPayload<{
  include: typeof privateVenueInclude;
}>;

@Injectable()
export class VenueService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createVenue(userId: string, dto: CreateVenueDto) {
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);
    await this.validateLocation(dto.cityId, dto.districtId);

    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          cityId: dto.cityId,
          districtId: dto.districtId,
          line1: dto.line1,
          line2: dto.line2,
          postalCode: dto.postalCode,
          accessNotes: dto.accessNotes,
        },
      });

      const venue = await tx.venue.create({
        data: {
          partnerProfileId: partnerProfile.id,
          addressId: address.id,
          name: dto.name,
          description: dto.description,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          isActive: dto.isActive ?? true,
        },
        include: privateVenueInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'venue.created',
          targetEntity: 'venue',
          targetId: venue.id,
          metadata: {
            partnerProfileId: partnerProfile.id,
            addressId: address.id,
          } as Prisma.InputJsonValue,
        },
      });

      return venue;
    });
  }

  async listMyVenues(userId: string) {
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);

    return this.prisma.venue.findMany({
      where: {
        partnerProfileId: partnerProfile.id,
      },
      include: privateVenueInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyVenue(userId: string, venueId: string) {
    return this.getOwnedVenueOrThrow(userId, venueId);
  }

  async updateVenue(userId: string, venueId: string, dto: UpdateVenueDto) {
    const venue = await this.getOwnedVenueOrThrow(userId, venueId);
    const nextCityId = dto.cityId ?? venue.address.cityId;
    const nextDistrictId = dto.districtId ?? venue.address.districtId;

    await this.validateLocation(nextCityId, nextDistrictId);

    return this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: {
          id: venue.addressId,
        },
        data: {
          cityId: nextCityId,
          districtId: nextDistrictId,
          line1: dto.line1,
          line2: dto.line2,
          postalCode: dto.postalCode,
          accessNotes: dto.accessNotes,
        },
      });

      const updatedVenue = await tx.venue.update({
        where: {
          id: venueId,
        },
        data: {
          name: dto.name,
          description: dto.description,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          isActive: dto.isActive,
        },
        include: privateVenueInclude,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'venue.updated',
          targetEntity: 'venue',
          targetId: venueId,
          metadata: {
            partnerProfileId: venue.partnerProfileId,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedVenue;
    });
  }

  async createCourt(userId: string, venueId: string, dto: CreateCourtDto) {
    const venue = await this.getOwnedVenueOrThrow(userId, venueId);

    return this.prisma.$transaction(async (tx) => {
      const court = await tx.court.create({
        data: {
          venueId: venue.id,
          name: dto.name,
          surfaceType: dto.surfaceType,
          isIndoor: dto.isIndoor ?? false,
          hasLighting: dto.hasLighting ?? false,
          isActive: dto.isActive ?? true,
          notes: dto.notes,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court.created',
          targetEntity: 'court',
          targetId: court.id,
          metadata: {
            venueId: venue.id,
          } as Prisma.InputJsonValue,
        },
      });

      return court;
    });
  }

  async updateCourt(userId: string, venueId: string, courtId: string, dto: UpdateCourtDto) {
    await this.getOwnedVenueOrThrow(userId, venueId);
    const court = await this.getOwnedCourtOrThrow(userId, venueId, courtId);

    return this.prisma.$transaction(async (tx) => {
      const updatedCourt = await tx.court.update({
        where: {
          id: court.id,
        },
        data: {
          name: dto.name,
          surfaceType: dto.surfaceType,
          isIndoor: dto.isIndoor,
          hasLighting: dto.hasLighting,
          isActive: dto.isActive,
          notes: dto.notes,
          sortOrder: dto.sortOrder,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court.updated',
          targetEntity: 'court',
          targetId: court.id,
          metadata: {
            venueId,
          } as Prisma.InputJsonValue,
        },
      });

      return updatedCourt;
    });
  }

  listPublicVenues(query: ListPublicVenuesQueryDto) {
    return this.prisma.venue.findMany({
      where: {
        isActive: true,
        partnerProfile: {
          is: {
            verificationStatus: 'verified',
          },
        },
        ...(query.cityId
          ? {
              address: {
                is: {
                  cityId: query.cityId,
                },
              },
            }
          : {}),
      },
      include: publicVenueInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPublicVenue(venueId: string) {
    const venue = await this.prisma.venue.findFirst({
      where: {
        id: venueId,
        isActive: true,
        partnerProfile: {
          is: {
            verificationStatus: 'verified',
          },
        },
      },
      include: publicVenueInclude,
    });

    if (!venue) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.venueNotFound,
        message: 'Площадка не найдена.',
      });
    }

    return venue;
  }

  private async getPartnerProfileOrThrow(userId: string) {
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: {
        ownerUserId: userId,
      },
    });

    if (!partnerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.partnerProfileNotFound,
        message: 'Профиль партнёра не найден.',
      });
    }

    return partnerProfile;
  }

  private async getOwnedVenueOrThrow(userId: string, venueId: string): Promise<PrivateVenuePayload> {
    const venue = await this.prisma.venue.findFirst({
      where: {
        id: venueId,
        partnerProfile: {
          is: {
            ownerUserId: userId,
          },
        },
      },
      include: privateVenueInclude,
    });

    if (!venue) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.venueNotFound,
        message: 'Площадка не найдена.',
      });
    }

    return venue;
  }

  private async getOwnedCourtOrThrow(userId: string, venueId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        venueId,
        venue: {
          is: {
            partnerProfile: {
              is: {
                ownerUserId: userId,
              },
            },
          },
        },
      },
    });

    if (!court) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.courtNotFound,
        message: 'Корт не найден.',
      });
    }

    return court;
  }

  private async validateLocation(cityId: string | null | undefined, districtId?: string | null) {
    if (!cityId) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте данные площадки.',
        fields: {
          cityId: ['Укажите город площадки.'],
        },
      });
    }

    const city = await this.prisma.city.findUnique({
      where: {
        id: cityId,
      },
    });

    if (!city) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте данные площадки.',
        fields: {
          cityId: ['Выбранный город не найден.'],
        },
      });
    }

    if (!districtId) {
      return;
    }

    const district = await this.prisma.district.findUnique({
      where: {
        id: districtId,
      },
    });

    if (!district) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте данные площадки.',
        fields: {
          districtId: ['Выбранный район не найден.'],
        },
      });
    }

    if (district.cityId !== cityId) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте данные площадки.',
        fields: {
          districtId: ['Район должен принадлежать выбранному городу.'],
        },
      });
    }
  }

}
