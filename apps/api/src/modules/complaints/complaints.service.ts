import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ComplaintStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ListComplaintsQueryDto } from './dto/list-complaints-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

const complaintInclude = Prisma.validator<Prisma.ComplaintInclude>()({
  createdByUser: {
    include: {
      playerProfile: true,
    },
  },
  targetUser: {
    include: {
      playerProfile: true,
    },
  },
  relatedBookingRequest: {
    select: {
      id: true,
      status: true,
      bookingDate: true,
      timeFrom: true,
      timeTo: true,
      venue: {
        select: {
          name: true,
        },
      },
      court: {
        select: {
          name: true,
        },
      },
    },
  },
  relatedMatchRequest: {
    select: {
      id: true,
      status: true,
      proposedDate: true,
      proposedTimeFrom: true,
      proposedTimeTo: true,
      format: true,
    },
  },
});

const finalStatuses: ComplaintStatus[] = ['resolved', 'rejected'];
const allowedTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
  pending: ['in_review', 'resolved', 'rejected'],
  in_review: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
};

@Injectable()
export class ComplaintsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async createComplaint(userId: string, dto: CreateComplaintDto) {
    const description = dto.description.trim();

    if (description.length < 10) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте описание жалобы.',
        fields: {
          description: ['Описание жалобы должно быть не короче 10 символов.'],
        },
      });
    }

    this.ensureHasContext(dto);
    await this.ensureTargetUserExists(dto.targetUserId);
    await this.ensureBookingContextAccess(userId, dto.relatedBookingRequestId);
    await this.ensureMatchContextAccess(userId, dto.relatedMatchRequestId);

    return this.prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          createdByUserId: userId,
          targetUserId: dto.targetUserId,
          relatedBookingRequestId: dto.relatedBookingRequestId,
          relatedMatchRequestId: dto.relatedMatchRequestId,
          type: dto.type,
          description,
          status: 'pending',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'complaint.created',
          targetEntity: 'complaint',
          targetId: complaint.id,
          metadata: {
            type: complaint.type,
            targetUserId: complaint.targetUserId,
            relatedBookingRequestId: complaint.relatedBookingRequestId,
            relatedMatchRequestId: complaint.relatedMatchRequestId,
          } as Prisma.InputJsonValue,
        },
      });

      const adminUserIds = await this.notificationsService.getAdminUserIds(tx);
      await this.notificationsService.createNotificationsForUsers(
        adminUserIds,
        'complaint_created',
        'Новая жалоба от пользователя',
        'Пользователь отправил жалобу. Проверьте её в админ-разделе.',
        {
          type: 'complaint',
          id: complaint.id,
        },
        tx,
      );

      return tx.complaint.findUnique({
        where: {
          id: complaint.id,
        },
        include: complaintInclude,
      });
    });
  }

  listMyComplaints(userId: string) {
    return this.prisma.complaint.findMany({
      where: {
        createdByUserId: userId,
      },
      include: complaintInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getComplaintForUser(complaintId: string, userId: string, roles: string[]) {
    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    const complaint = await this.prisma.complaint.findFirst({
      where: {
        id: complaintId,
        ...(isAdmin ? {} : { createdByUserId: userId }),
      },
      include: complaintInclude,
    });

    if (!complaint) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.complaintNotFound,
        message: 'Жалоба не найдена.',
      });
    }

    return complaint;
  }

  listAdminComplaints(query: ListComplaintsQueryDto) {
    return this.prisma.complaint.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      include: complaintInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateComplaintStatus(
    adminUserId: string,
    complaintId: string,
    dto: UpdateComplaintStatusDto,
  ) {
    const complaint = await this.prisma.complaint.findUnique({
      where: {
        id: complaintId,
      },
    });

    if (!complaint) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.complaintNotFound,
        message: 'Жалоба не найдена.',
      });
    }

    if (finalStatuses.includes(complaint.status)) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.complaintAlreadyFinalized,
        message: 'Финализированную жалобу нельзя изменить.',
      });
    }

    if (!allowedTransitions[complaint.status].includes(dto.status)) {
      throw new AppError(HttpStatus.CONFLICT, {
        code: ERROR_CODES.complaintInvalidTransition,
        message: 'Недопустимый переход статуса жалобы.',
      });
    }

    const resolutionComment = dto.resolutionComment?.trim() || undefined;

    return this.prisma.$transaction(async (tx) => {
      const updatedComplaint = await tx.complaint.update({
        where: {
          id: complaint.id,
        },
        data: {
          status: dto.status,
          ...(resolutionComment !== undefined ? { resolutionComment } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminUserId,
          action: 'complaint.status_updated',
          targetEntity: 'complaint',
          targetId: complaint.id,
          metadata: {
            previousStatus: complaint.status,
            nextStatus: dto.status,
          } as Prisma.InputJsonValue,
        },
      });

      await this.notificationsService.createNotification(
        complaint.createdByUserId,
        'complaint_status_updated',
        'Ваша жалоба рассмотрена',
        this.getStatusNotificationBody(dto.status),
        {
          type: 'complaint',
          id: complaint.id,
        },
        tx,
      );

      return tx.complaint.findUnique({
        where: {
          id: updatedComplaint.id,
        },
        include: complaintInclude,
      });
    });
  }

  private ensureHasContext(dto: CreateComplaintDto) {
    if (dto.targetUserId || dto.relatedBookingRequestId || dto.relatedMatchRequestId) {
      return;
    }

    throw new AppError(HttpStatus.BAD_REQUEST, {
      code: ERROR_CODES.complaintMissingContext,
      message: 'Для жалобы нужен контекст: пользователь, booking или match.',
      fields: {
        context: ['Укажите targetUserId, relatedBookingRequestId или relatedMatchRequestId.'],
      },
    });
  }

  private async ensureTargetUserExists(targetUserId?: string) {
    if (!targetUserId) {
      return;
    }

    const targetUser = await this.prisma.user.findUnique({
      where: {
        id: targetUserId,
      },
      select: {
        id: true,
      },
    });

    if (!targetUser) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.notFound,
        message: 'Пользователь для жалобы не найден.',
      });
    }
  }

  private async ensureBookingContextAccess(userId: string, bookingRequestId?: string) {
    if (!bookingRequestId) {
      return;
    }

    const bookingRequest = await this.prisma.bookingRequest.findUnique({
      where: {
        id: bookingRequestId,
      },
      include: {
        playerProfile: true,
        partnerProfile: true,
        relatedMatchRequest: true,
      },
    });

    if (!bookingRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.bookingRequestNotFound,
        message: 'Заявка на бронирование не найдена.',
      });
    }

    const canAccess =
      bookingRequest.playerProfile.userId === userId ||
      bookingRequest.partnerProfile.ownerUserId === userId ||
      bookingRequest.relatedMatchRequest?.initiatorId === userId ||
      bookingRequest.relatedMatchRequest?.opponentId === userId;

    if (!canAccess) {
      throw new AppError(HttpStatus.FORBIDDEN, {
        code: ERROR_CODES.complaintContextForbidden,
        message: 'У вас нет доступа к booking-контексту этой жалобы.',
      });
    }
  }

  private async ensureMatchContextAccess(userId: string, matchRequestId?: string) {
    if (!matchRequestId) {
      return;
    }

    const matchRequest = await this.prisma.matchRequest.findUnique({
      where: {
        id: matchRequestId,
      },
    });

    if (!matchRequest) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.matchRequestNotFound,
        message: 'Вызов на игру не найден.',
      });
    }

    if (matchRequest.initiatorId === userId || matchRequest.opponentId === userId) {
      return;
    }

    throw new AppError(HttpStatus.FORBIDDEN, {
      code: ERROR_CODES.complaintContextForbidden,
      message: 'У вас нет доступа к match-контексту этой жалобы.',
    });
  }

  private getStatusNotificationBody(status: ComplaintStatus) {
    switch (status) {
      case 'in_review':
        return 'Администратор взял вашу жалобу в работу.';
      case 'resolved':
        return 'Администратор завершил рассмотрение вашей жалобы.';
      case 'rejected':
        return 'Администратор отклонил вашу жалобу.';
      default:
        return 'Статус вашей жалобы изменился.';
    }
  }
}
