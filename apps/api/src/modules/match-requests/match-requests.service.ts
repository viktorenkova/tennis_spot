import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MatchRequest, MatchRequestStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';

const matchRequestInclude = Prisma.validator<Prisma.MatchRequestInclude>()({
  initiator: {
    include: {
      playerProfile: {
        include: {
          city: true,
          district: true,
        },
      },
    },
  },
  opponent: {
    include: {
      playerProfile: {
        include: {
          city: true,
          district: true,
        },
      },
    },
  },
});

@Injectable()
export class MatchRequestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async createMatchRequest(userId: string, dto: CreateMatchRequestDto) {
    if (userId === dto.opponentId) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidOpponent,
        message: 'Нельзя отправить вызов самому себе.',
      });
    }

    const initiatorProfile = await this.getActivePlayerProfileOrThrow(userId);
    await this.getActivePlayerProfileOrThrow(dto.opponentId);
    const proposedDate = this.parseFutureDate(dto.proposedDate);
    this.ensureValidTimeRange(dto.proposedTimeFrom, dto.proposedTimeTo);

    return this.prisma.$transaction(async (tx) => {
      const matchRequest = await tx.matchRequest.create({
        data: {
          initiatorId: userId,
          opponentId: dto.opponentId,
          proposedDate,
          proposedTimeFrom: dto.proposedTimeFrom,
          proposedTimeTo: dto.proposedTimeTo,
          format: dto.format,
          message: dto.message,
          status: 'pending',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'match_request.created',
          targetEntity: 'match_request',
          targetId: matchRequest.id,
          metadata: {
            opponentId: dto.opponentId,
            proposedDate: dto.proposedDate,
            proposedTimeFrom: dto.proposedTimeFrom,
            proposedTimeTo: dto.proposedTimeTo,
            format: dto.format,
          } as Prisma.InputJsonValue,
        },
      });

      await this.notificationsService.createNotification(
        dto.opponentId,
        'match_request_created',
        'Вам отправлен вызов на игру',
        `${initiatorProfile.firstName} ${initiatorProfile.lastName} отправил вызов на ${dto.proposedDate} ${dto.proposedTimeFrom} - ${dto.proposedTimeTo}.`,
        {
          type: 'match_request',
          id: matchRequest.id,
        },
        tx,
      );

      return tx.matchRequest.findUnique({
        where: {
          id: matchRequest.id,
        },
        include: matchRequestInclude,
      });
    });
  }

  listIncoming(userId: string) {
    return this.prisma.matchRequest.findMany({
      where: {
        opponentId: userId,
      },
      include: matchRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  listOutgoing(userId: string) {
    return this.prisma.matchRequest.findMany({
      where: {
        initiatorId: userId,
      },
      include: matchRequestInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async accept(userId: string, matchRequestId: string) {
    const matchRequest = await this.getIncomingMatchRequestOrThrow(userId, matchRequestId);

    return this.transitionMatchRequest(matchRequest, userId, 'accepted', 'match_request.accepted');
  }

  async decline(userId: string, matchRequestId: string) {
    const matchRequest = await this.getIncomingMatchRequestOrThrow(userId, matchRequestId);

    return this.transitionMatchRequest(matchRequest, userId, 'declined', 'match_request.declined');
  }

  async cancel(userId: string, matchRequestId: string) {
    const matchRequest = await this.getOutgoingMatchRequestOrThrow(userId, matchRequestId);

    return this.transitionMatchRequest(matchRequest, userId, 'cancelled', 'match_request.cancelled');
  }

  private async transitionMatchRequest(
    matchRequest: MatchRequest,
    actorUserId: string,
    nextStatus: MatchRequestStatus,
    auditAction: string,
  ) {
    this.ensurePending(matchRequest);

    return this.prisma.$transaction(async (tx) => {
      const updatedMatchRequest = await tx.matchRequest.update({
        where: {
          id: matchRequest.id,
        },
        data: {
          status: nextStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: auditAction,
          targetEntity: 'match_request',
          targetId: matchRequest.id,
          metadata: {
            previousStatus: matchRequest.status,
            nextStatus,
          } as Prisma.InputJsonValue,
        },
      });

      const notification = this.getTransitionNotification(matchRequest, nextStatus);

      await this.notificationsService.createNotification(
        notification.userId,
        notification.type,
        notification.title,
        notification.body,
        {
          type: 'match_request',
          id: matchRequest.id,
        },
        tx,
      );

      return tx.matchRequest.findUnique({
        where: {
          id: updatedMatchRequest.id,
        },
        include: matchRequestInclude,
      });
    });
  }

  private getTransitionNotification(matchRequest: MatchRequest, nextStatus: MatchRequestStatus) {
    const matchDescription = `${this.formatDate(matchRequest.proposedDate)} ${matchRequest.proposedTimeFrom} - ${matchRequest.proposedTimeTo}`;

    switch (nextStatus) {
      case 'accepted':
        return {
          userId: matchRequest.initiatorId,
          type: 'match_request_accepted' as const,
          title: 'Ваш вызов принят',
          body: `Соперник принял вызов на ${matchDescription}.`,
        };
      case 'declined':
        return {
          userId: matchRequest.initiatorId,
          type: 'match_request_declined' as const,
          title: 'Ваш вызов отклонён',
          body: `Соперник отклонил вызов на ${matchDescription}.`,
        };
      case 'cancelled':
        return {
          userId: matchRequest.opponentId,
          type: 'match_request_cancelled' as const,
          title: 'Вызов отменён',
          body: `Игрок отменил вызов на ${matchDescription}.`,
        };
      default:
        throw new AppError(HttpStatus.CONFLICT, {
          code: ERROR_CODES.matchRequestInvalidTransition,
          message: 'Недопустимый переход статуса вызова.',
        });
    }
  }

  private async getIncomingMatchRequestOrThrow(userId: string, matchRequestId: string) {
    const matchRequest = await this.prisma.matchRequest.findFirst({
      where: {
        id: matchRequestId,
        opponentId: userId,
      },
    });

    if (!matchRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.matchRequestNotFound,
        message: 'Вызов на игру не найден.',
      });
    }

    return matchRequest;
  }

  private async getOutgoingMatchRequestOrThrow(userId: string, matchRequestId: string) {
    const matchRequest = await this.prisma.matchRequest.findFirst({
      where: {
        id: matchRequestId,
        initiatorId: userId,
      },
    });

    if (!matchRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.matchRequestNotFound,
        message: 'Вызов на игру не найден.',
      });
    }

    return matchRequest;
  }

  private async getActivePlayerProfileOrThrow(userId: string) {
    const profile = await this.prisma.playerProfile.findFirst({
      where: {
        userId,
        status: 'active',
        user: {
          is: {
            status: 'active',
          },
        },
      },
    });

    if (!profile) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.playerProfileNotFound,
        message: 'Активный профиль игрока не найден.',
      });
    }

    return profile;
  }

  private ensurePending(matchRequest: MatchRequest) {
    if (matchRequest.status === 'pending') {
      return;
    }

    throw new AppError(HttpStatus.CONFLICT, {
      code: ERROR_CODES.matchRequestInvalidTransition,
      message: 'Вызов уже финализирован, изменить его статус нельзя.',
    });
  }

  private parseFutureDate(value: string) {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidSchedule,
        message: 'Дата игры должна быть корректной.',
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (date <= today) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidSchedule,
        message: 'Дата игры должна быть в будущем.',
      });
    }

    return date;
  }

  private ensureValidTimeRange(timeFrom: string, timeTo: string) {
    const start = this.parseTimeToMinutes(timeFrom);
    const end = this.parseTimeToMinutes(timeTo);

    if (end <= start) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidSchedule,
        message: 'Время окончания должно быть позже времени начала.',
      });
    }
  }

  private parseTimeToMinutes(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidSchedule,
        message: 'Время должно быть в формате HH:mm.',
      });
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.matchRequestInvalidSchedule,
        message: 'Время должно быть корректным.',
      });
    }

    return hours * 60 + minutes;
  }

  private formatDate(value: Date | string) {
    return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  }
}
