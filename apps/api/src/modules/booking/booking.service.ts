import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BookingRequestStatus, NotificationType, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CourtAvailabilityService } from '../court-schedule/court-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingFromMatchRequestDto } from './dto/create-booking-from-match-request.dto';
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
  relatedMatchRequest: {
    include: {
      initiator: {
        include: {
          playerProfile: true,
        },
      },
      opponent: {
        include: {
          playerProfile: true,
        },
      },
    },
  },
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
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async findBookingOptions(query: FindBookingOptionsQueryDto) {
    if (!query.bookingDate || !query.timeFrom || !query.timeTo) {
      return [];
    }

    this.parseBookingDate(query.bookingDate);
    this.getDurationMinutes(query.timeFrom, query.timeTo);
    const playersCount = query.playersCount ?? 2;

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
              playersCount,
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

      await this.notificationsService.createNotification(
        venue.partnerProfile.ownerUserId,
        'booking_created',
        'Новая заявка на бронирование',
        `Игрок отправил заявку на ${venue.name}, ${court.name}: ${dto.bookingDate} ${dto.timeFrom} - ${dto.timeTo}.`,
        {
          type: 'booking_request',
          id: bookingRequest.id,
        },
        tx,
      );

      return tx.bookingRequest.findUnique({
        where: {
          id: bookingRequest.id,
        },
        include: bookingDetailsInclude,
      });
    });
  }

  async createBookingFromMatchRequest(
    userId: string,
    matchRequestId: string,
    dto: CreateBookingFromMatchRequestDto,
  ) {
    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: {
        id: matchRequestId,
      },
      include: {
        initiator: {
          include: {
            playerProfile: true,
          },
        },
        opponent: {
          include: {
            playerProfile: true,
          },
        },
        relatedBookingRequest: true,
      },
    });

    if (
      !matchRequest ||
      (matchRequest.initiatorId !== userId && matchRequest.opponentId !== userId)
    ) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.matchRequestNotFound,
        message: 'Вызов на игру не найден.',
      });
    }

    if (matchRequest.status !== 'accepted') {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.matchRequestInvalidTransition,
        message: 'Бронь можно оформить только для принятого вызова.',
      });
    }

    if (matchRequest.relatedBookingRequest) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.matchRequestBookingAlreadyExists,
        message: 'Для этого вызова уже создана бронь.',
      });
    }

    const existingBooking = await this.prisma.bookingRequest.findFirst({
      where: {
        relatedMatchRequestId: matchRequest.id,
      },
    });

    if (existingBooking) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.matchRequestBookingAlreadyExists,
        message: 'Для этого вызова уже создана бронь.',
      });
    }

    const playerProfile = await this.getPlayerProfileOrThrow(userId);
    const venue = await this.getBookableVenueOrThrow(dto.venueId);
    const court = await this.getBookableCourtOrThrow(dto.venueId, dto.courtId);
    const bookingDateText = this.formatDateForAvailability(matchRequest.proposedDate);
    const bookingDate = this.parseBookingDate(bookingDateText);
    const durationMinutes = this.getDurationMinutes(
      matchRequest.proposedTimeFrom,
      matchRequest.proposedTimeTo,
    );
    const playersCount = this.getPlayersCountForMatchFormat(matchRequest.format);

    await this.courtAvailabilityService.ensureCourtBookableInterval(
      court.id,
      bookingDateText,
      matchRequest.proposedTimeFrom,
      matchRequest.proposedTimeTo,
    );

    const secondPlayerId =
      userId === matchRequest.initiatorId ? matchRequest.opponentId : matchRequest.initiatorId;

    return this.prisma.$transaction(async (tx) => {
      const bookingRequest = await tx.bookingRequest.create({
        data: {
          playerProfileId: playerProfile.id,
          partnerProfileId: venue.partnerProfileId,
          venueId: venue.id,
          courtId: court.id,
          relatedMatchRequestId: matchRequest.id,
          bookingDate,
          timeFrom: matchRequest.proposedTimeFrom,
          timeTo: matchRequest.proposedTimeTo,
          durationMinutes,
          playersCount,
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
          action: 'booking_request.created_from_match',
          targetEntity: 'booking_request',
          targetId: bookingRequest.id,
          metadata: {
            relatedMatchRequestId: matchRequest.id,
            playerProfileId: playerProfile.id,
            partnerProfileId: venue.partnerProfileId,
            venueId: venue.id,
            courtId: court.id,
            previousStatus: 'draft',
            nextStatus: 'pending',
          } as Prisma.InputJsonValue,
        },
      });

      await this.notificationsService.createNotification(
        venue.partnerProfile.ownerUserId,
        'booking_created',
        'Новая заявка на бронирование',
        `Игрок отправил заявку на ${venue.name}, ${court.name}: ${bookingDateText} ${matchRequest.proposedTimeFrom} - ${matchRequest.proposedTimeTo}.`,
        {
          type: 'booking_request',
          id: bookingRequest.id,
        },
        tx,
      );

      await this.notificationsService.createNotification(
        secondPlayerId,
        'match_booking_created',
        'Создана бронь для вашей игры',
        `Игрок оформил бронь для игры на ${bookingDateText} ${matchRequest.proposedTimeFrom} - ${matchRequest.proposedTimeTo}.`,
        {
          type: 'booking_request',
          id: bookingRequest.id,
        },
        tx,
      );

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
        OR: [
          {
            playerProfileId: playerProfile.id,
          },
          {
            relatedMatchRequest: {
              is: {
                OR: [
                  {
                    initiatorId: userId,
                  },
                  {
                    opponentId: userId,
                  },
                ],
              },
            },
          },
        ],
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
        OR: [
          {
            playerProfileId: playerProfile.id,
          },
          {
            relatedMatchRequest: {
              is: {
                OR: [
                  {
                    initiatorId: userId,
                  },
                  {
                    opponentId: userId,
                  },
                ],
              },
            },
          },
        ],
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

      const notification = this.getBookingTransitionNotification(bookingRequest, nextStatus);

      if (notification) {
        await this.notificationsService.createNotification(
          notification.userId,
          notification.type,
          notification.title,
          notification.body,
          {
            type: 'booking_request',
            id: bookingRequest.id,
          },
          tx,
        );
      }

      return tx.bookingRequest.findUnique({
        where: {
          id: updatedBookingRequest.id,
        },
        include: bookingDetailsInclude,
      });
    });
  }

  private getBookingTransitionNotification(
    bookingRequest: BookingRequestRecord,
    nextStatus: BookingRequestStatus,
  ):
    | {
        userId: string;
        type: NotificationType;
        title: string;
        body: string;
      }
    | null {
    const bookingDescription = `${this.formatDateForAvailability(bookingRequest.bookingDate)} ${bookingRequest.timeFrom} - ${bookingRequest.timeTo}`;

    switch (nextStatus) {
      case 'confirmed':
        return {
          userId: bookingRequest.playerProfile.userId,
          type: 'booking_confirmed',
          title: 'Заявка на бронирование подтверждена',
          body: `Партнёр подтвердил вашу заявку на ${bookingDescription}.`,
        };
      case 'rejected':
        return {
          userId: bookingRequest.playerProfile.userId,
          type: 'booking_rejected',
          title: 'Заявка на бронирование отклонена',
          body: `Партнёр отклонил вашу заявку на ${bookingDescription}.`,
        };
      case 'cancelled_by_player':
        return {
          userId: bookingRequest.partnerProfile.ownerUserId,
          type: 'booking_cancelled',
          title: 'Заявка на бронирование отменена',
          body: `Игрок отменил заявку на ${bookingDescription}.`,
        };
      case 'cancelled_by_partner':
        return {
          userId: bookingRequest.playerProfile.userId,
          type: 'booking_cancelled',
          title: 'Заявка на бронирование отменена',
          body: `Партнёр отменил заявку на ${bookingDescription}.`,
        };
      case 'completed':
        return {
          userId: bookingRequest.playerProfile.userId,
          type: 'booking_completed',
          title: 'Бронирование завершено',
          body: `Партнёр отметил заявку на ${bookingDescription} как завершённую.`,
        };
      default:
        return null;
    }
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

  private getPlayersCountForMatchFormat(format: string) {
    return format === 'doubles' ? 4 : 2;
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
