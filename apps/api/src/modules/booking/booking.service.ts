import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BookingRequestStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CourtAvailabilityService } from '../court-schedule/court-availability.service';
import { CreateBookingRequestDto } from './dto/create-booking-request.dto';
import { FindBookingOptionsQueryDto } from './dto/find-booking-options-query.dto';

const bookingListInclude = Prisma.validator<Prisma.BookingRequestInclude>()({
  playerProfile: {
    include: {
      user: true,
    },
  },
  venue: {
    include: {
      address: {
        include: {
          city: true,
          district: true,
        },
      },
    },
  },
  court: true,
});

const bookingDetailsInclude = Prisma.validator<Prisma.BookingRequestInclude>()({
  ...bookingListInclude,
  partnerProfile: {
    include: {
      ownerUser: true,
      profileTypes: {
        include: {
          partnerType: true,
        },
      },
    },
  },
  statusHistory: {
    include: {
      changedByUser: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
});

type BookingRequestRecord = Prisma.BookingRequestGetPayload<{
  include: typeof bookingDetailsInclude;
}>;

const bookingOptionVenueInclude = Prisma.validator<Prisma.VenueInclude>()({
  address: {
    include: {
      city: true,
      district: true,
    },
  },
  partnerProfile: true,
  courts: {
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  },
});

const allowedTransitions: Record<BookingRequestStatus, BookingRequestStatus[]> = {
  draft: ['pending'],
  pending: ['confirmed', 'rejected', 'cancelled_by_player', 'expired'],
  confirmed: ['cancelled_by_player', 'cancelled_by_partner', 'completed'],
  rejected: [],
  cancelled_by_player: [],
  cancelled_by_partner: [],
  expired: [],
  completed: [],
};

@Injectable()
export class BookingService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CourtAvailabilityService)
    private readonly courtAvailabilityService: CourtAvailabilityService,
  ) {}

  async findBookingOptions(query: FindBookingOptionsQueryDto) {
    if (!query.bookingDate || !query.timeFrom || !query.timeTo) {
      return [];
    }

    this.parseBookingDate(query.bookingDate);
    this.getDurationMinutes(query.timeFrom, query.timeTo);

    const venues = await this.prisma.venue.findMany({
      where: {
        isActive: true,
        partnerProfile: {
          is: {
            verificationStatus: 'verified',
          },
        },
        ...(query.cityId || query.districtId
          ? {
              address: {
                is: {
                  ...(query.cityId ? { cityId: query.cityId } : {}),
                  ...(query.districtId ? { districtId: query.districtId } : {}),
                },
              },
            }
          : {}),
      },
      include: bookingOptionVenueInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const options = await Promise.all(
      venues.flatMap((venue) =>
        venue.courts.map(async (court) => {
          if (query.surfaceType && court.surfaceType !== query.surfaceType) {
            return null;
          }

          if (query.courtType === 'indoor' && !court.isIndoor) {
            return null;
          }

          if (query.courtType === 'outdoor' && court.isIndoor) {
            return null;
          }

          const availability = await this.courtAvailabilityService.buildAvailability(
            court.id,
            query.bookingDate!,
          );

          const matchingInterval = availability.intervals.find(
            (interval) =>
              interval.timeFrom === query.timeFrom &&
              interval.timeTo === query.timeTo &&
              interval.isAvailable,
          );

          if (!matchingInterval) {
            return null;
          }

          return {
            venue: {
              id: venue.id,
              name: venue.name,
              activeCourtsCount: venue.courts.length,
              address: venue.address,
            },
            partnerProfile: {
              id: venue.partnerProfile.id,
              legalName: venue.partnerProfile.legalName,
              brandName: venue.partnerProfile.brandName,
            },
            court: {
              id: court.id,
              name: court.name,
              surfaceType: court.surfaceType,
              isIndoor: court.isIndoor,
              hasLighting: court.hasLighting,
            },
            availableInterval: {
              bookingDate: query.bookingDate,
              timeFrom: matchingInterval.timeFrom,
              timeTo: matchingInterval.timeTo,
              slotDurationMinutes: matchingInterval.slotDurationMinutes,
              price: matchingInterval.price,
            },
          };
        }),
      ),
    );

    return options.filter((option) => option !== null);
  }

  async createBookingRequest(userId: string, dto: CreateBookingRequestDto) {
    const playerProfile = await this.getPlayerProfileOrThrow(userId);
    const venue = await this.getBookableVenueOrThrow(dto.venueId);
    const court = await this.getBookableCourtOrThrow(dto.venueId, dto.courtId);
    const bookingDate = this.parseBookingDate(dto.bookingDate);
    const durationMinutes = this.getDurationMinutes(dto.timeFrom, dto.timeTo);
    await this.courtAvailabilityService.ensureCourtBookableInterval(
      court.id,
      dto.bookingDate,
      dto.timeFrom,
      dto.timeTo,
    );

    return this.prisma.$transaction(async (tx) => {
      const bookingRequest = await tx.bookingRequest.create({
        data: {
          playerProfileId: playerProfile.id,
          partnerProfileId: venue.partnerProfileId,
          venueId: venue.id,
          courtId: court.id,
          bookingDate,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
          durationMinutes,
          playersCount: dto.playersCount,
          commentFromPlayer: dto.commentFromPlayer,
          status: 'pending',
          submittedAt: new Date(),
        },
      });

      await tx.bookingRequestStatusHistory.create({
        data: {
          bookingRequestId: bookingRequest.id,
          oldStatus: 'draft',
          newStatus: 'pending',
          changedByUserId: userId,
          comment: dto.commentFromPlayer ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'booking_request.created',
          targetEntity: 'booking_request',
          targetId: bookingRequest.id,
          metadata: {
            playerProfileId: playerProfile.id,
            partnerProfileId: venue.partnerProfileId,
            venueId: venue.id,
            courtId: court.id,
            previousStatus: 'draft',
            nextStatus: 'pending',
          } as Prisma.InputJsonValue,
        },
      });

      return tx.bookingRequest.findUnique({
        where: {
          id: bookingRequest.id,
        },
        include: bookingDetailsInclude,
      });
    });
  }

  async listMyBookingRequests(userId: string) {
    const playerProfile = await this.getPlayerProfileOrThrow(userId);

    return this.prisma.bookingRequest.findMany({
      where: {
        playerProfileId: playerProfile.id,
      },
      include: bookingListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMyBookingRequest(userId: string, bookingRequestId: string) {
    const playerProfile = await this.getPlayerProfileOrThrow(userId);

    const bookingRequest = await this.prisma.bookingRequest.findFirst({
      where: {
        id: bookingRequestId,
        playerProfileId: playerProfile.id,
      },
      include: bookingDetailsInclude,
    });

    if (!bookingRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.bookingRequestNotFound,
        message: 'Заявка на бронирование не найдена.',
      });
    }

    return bookingRequest;
  }

  async cancelByPlayer(userId: string, bookingRequestId: string, commentFromPlayer?: string) {
    const bookingRequest = await this.getPlayerOwnedBookingRequestOrThrow(userId, bookingRequestId);

    return this.transitionBookingRequest(
      bookingRequest,
      userId,
      'cancelled_by_player',
      'booking_request.cancelled_by_player',
      {
        cancelledAt: new Date(),
        commentFromPlayer:
          commentFromPlayer ?? bookingRequest.commentFromPlayer ?? undefined,
      },
      commentFromPlayer,
    );
  }

  async listPartnerBookingRequests(userId: string) {
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);

    return this.prisma.bookingRequest.findMany({
      where: {
        partnerProfileId: partnerProfile.id,
      },
      include: bookingListInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async confirmByPartner(userId: string, bookingRequestId: string, commentFromPartner?: string) {
    const bookingRequest = await this.getPartnerOwnedBookingRequestOrThrow(userId, bookingRequestId);
    await this.courtAvailabilityService.ensureCourtBookableInterval(
      bookingRequest.courtId,
      this.formatDateForAvailability(bookingRequest.bookingDate),
      bookingRequest.timeFrom,
      bookingRequest.timeTo,
      {
        ignoreBookingRequestId: bookingRequest.id,
      },
    );

    return this.transitionBookingRequest(
      bookingRequest,
      userId,
      'confirmed',
      'booking_request.confirmed',
      {
        respondedAt: new Date(),
        commentFromPartner:
          commentFromPartner ?? bookingRequest.commentFromPartner ?? undefined,
      },
      commentFromPartner,
    );
  }

  async rejectByPartner(userId: string, bookingRequestId: string, commentFromPartner?: string) {
    const bookingRequest = await this.getPartnerOwnedBookingRequestOrThrow(userId, bookingRequestId);

    return this.transitionBookingRequest(
      bookingRequest,
      userId,
      'rejected',
      'booking_request.rejected',
      {
        respondedAt: new Date(),
        commentFromPartner:
          commentFromPartner ?? bookingRequest.commentFromPartner ?? undefined,
      },
      commentFromPartner,
    );
  }

  async cancelByPartner(userId: string, bookingRequestId: string, commentFromPartner?: string) {
    const bookingRequest = await this.getPartnerOwnedBookingRequestOrThrow(userId, bookingRequestId);

    return this.transitionBookingRequest(
      bookingRequest,
      userId,
      'cancelled_by_partner',
      'booking_request.cancelled_by_partner',
      {
        cancelledAt: new Date(),
        commentFromPartner:
          commentFromPartner ?? bookingRequest.commentFromPartner ?? undefined,
      },
      commentFromPartner,
    );
  }

  async completeByPartner(userId: string, bookingRequestId: string, commentFromPartner?: string) {
    const bookingRequest = await this.getPartnerOwnedBookingRequestOrThrow(userId, bookingRequestId);

    return this.transitionBookingRequest(
      bookingRequest,
      userId,
      'completed',
      'booking_request.completed',
      {
        commentFromPartner:
          commentFromPartner ?? bookingRequest.commentFromPartner ?? undefined,
      },
      commentFromPartner,
    );
  }

  private async transitionBookingRequest(
    bookingRequest: BookingRequestRecord,
    actorUserId: string,
    nextStatus: BookingRequestStatus,
    auditAction: string,
    updateData: Prisma.BookingRequestUpdateInput,
    historyComment?: string,
  ) {
    this.ensureTransitionAllowed(bookingRequest.status, nextStatus);

    return this.prisma.$transaction(async (tx) => {
      const updatedBookingRequest = await tx.bookingRequest.update({
        where: {
          id: bookingRequest.id,
        },
        data: {
          status: nextStatus,
          ...updateData,
        },
      });

      await tx.bookingRequestStatusHistory.create({
        data: {
          bookingRequestId: bookingRequest.id,
          oldStatus: bookingRequest.status,
          newStatus: nextStatus,
          changedByUserId: actorUserId,
          comment: historyComment ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: auditAction,
          targetEntity: 'booking_request',
          targetId: bookingRequest.id,
          metadata: {
            previousStatus: bookingRequest.status,
            nextStatus,
            venueId: bookingRequest.venueId,
            courtId: bookingRequest.courtId,
          } as Prisma.InputJsonValue,
        },
      });

      return tx.bookingRequest.findUnique({
        where: {
          id: updatedBookingRequest.id,
        },
        include: bookingDetailsInclude,
      });
    });
  }

  private ensureTransitionAllowed(currentStatus: BookingRequestStatus, nextStatus: BookingRequestStatus) {
    if (allowedTransitions[currentStatus].includes(nextStatus)) {
      return;
    }

    throw new AppError(HttpStatus.CONFLICT, {
      code: ERROR_CODES.bookingRequestInvalidTransition,
      message: 'Недопустимый переход статуса заявки на бронирование.',
    });
  }

  private async getPlayerProfileOrThrow(userId: string) {
    const playerProfile = await this.prisma.playerProfile.findUnique({
      where: {
        userId,
      },
    });

    if (!playerProfile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.playerProfileNotFound,
        message: 'Профиль игрока не найден.',
      });
    }

    return playerProfile;
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

  private async getBookableVenueOrThrow(venueId: string) {
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
      include: {
        partnerProfile: true,
      },
    });

    if (!venue) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.venueNotFound,
        message: 'Площадка не найдена.',
      });
    }

    return venue;
  }

  private async getBookableCourtOrThrow(venueId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
        venueId,
        isActive: true,
      },
    });

    if (!court) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.bookingRequestInvalidVenueCourt,
        message: 'Корт должен принадлежать выбранной площадке и быть доступным для бронирования.',
      });
    }

    return court;
  }

  private async getPlayerOwnedBookingRequestOrThrow(userId: string, bookingRequestId: string) {
    const playerProfile = await this.getPlayerProfileOrThrow(userId);

    const bookingRequest = await this.prisma.bookingRequest.findFirst({
      where: {
        id: bookingRequestId,
        playerProfileId: playerProfile.id,
      },
      include: bookingDetailsInclude,
    });

    if (!bookingRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.bookingRequestNotFound,
        message: 'Заявка на бронирование не найдена.',
      });
    }

    return bookingRequest;
  }

  private async getPartnerOwnedBookingRequestOrThrow(userId: string, bookingRequestId: string) {
    const partnerProfile = await this.getPartnerProfileOrThrow(userId);

    const bookingRequest = await this.prisma.bookingRequest.findFirst({
      where: {
        id: bookingRequestId,
        partnerProfileId: partnerProfile.id,
      },
      include: bookingDetailsInclude,
    });

    if (!bookingRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.bookingRequestNotFound,
        message: 'Заявка на бронирование не найдена.',
      });
    }

    return bookingRequest;
  }

  private parseBookingDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте дату бронирования.',
        fields: {
          bookingDate: ['Дата бронирования должна быть корректной.'],
        },
      });
    }

    return date;
  }

  private formatDateForAvailability(value: Date | string) {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }

  private getDurationMinutes(timeFrom: string, timeTo: string) {
    const start = this.parseTimeToMinutes(timeFrom);
    const end = this.parseTimeToMinutes(timeTo);

    if (end <= start) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте время бронирования.',
        fields: {
          timeTo: ['Время окончания должно быть позже времени начала.'],
        },
      });
    }

    return end - start;
  }

  private parseTimeToMinutes(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте время бронирования.',
      });
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте время бронирования.',
      });
    }

    return hours * 60 + minutes;
  }
}
