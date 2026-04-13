import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCourtScheduleExceptionDto } from './dto/create-court-schedule-exception.dto';
import { CreateCourtScheduleTemplateDto } from './dto/create-court-schedule-template.dto';
import { ScheduleExceptionTypeValue } from './schedule.constants';
import { UpdateCourtScheduleExceptionDto } from './dto/update-court-schedule-exception.dto';
import { UpdateCourtScheduleTemplateDto } from './dto/update-court-schedule-template.dto';

@Injectable()
export class CourtScheduleService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createTemplate(userId: string, courtId: string, dto: CreateCourtScheduleTemplateDto) {
    const court = await this.getOwnedCourtOrThrow(userId, courtId);
    this.validateTimeRange(dto.timeFrom, dto.timeTo, 'template');

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.courtScheduleTemplate.create({
        data: {
          courtId: court.id,
          weekday: dto.weekday,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
          slotDurationMinutes: dto.slotDurationMinutes,
          isOpen: dto.isOpen ?? true,
          basePrice: dto.basePrice,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_template.created',
          targetEntity: 'court_schedule_template',
          targetId: template.id,
          metadata: {
            courtId: court.id,
            venueId: court.venueId,
          } as Prisma.InputJsonValue,
        },
      });

      return template;
    });
  }

  async listTemplates(userId: string, courtId: string) {
    await this.getOwnedCourtOrThrow(userId, courtId);

    return this.prisma.courtScheduleTemplate.findMany({
      where: {
        courtId,
      },
      orderBy: [{ weekday: 'asc' }, { timeFrom: 'asc' }, { timeTo: 'asc' }],
    });
  }

  async updateTemplate(
    userId: string,
    courtId: string,
    templateId: string,
    dto: UpdateCourtScheduleTemplateDto,
  ) {
    const template = await this.getOwnedTemplateOrThrow(userId, courtId, templateId);
    const nextTimeFrom = dto.timeFrom ?? template.timeFrom;
    const nextTimeTo = dto.timeTo ?? template.timeTo;
    this.validateTimeRange(nextTimeFrom, nextTimeTo, 'template');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.courtScheduleTemplate.update({
        where: {
          id: template.id,
        },
        data: {
          weekday: dto.weekday,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
          slotDurationMinutes: dto.slotDurationMinutes,
          isOpen: dto.isOpen,
          basePrice: dto.basePrice,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_template.updated',
          targetEntity: 'court_schedule_template',
          targetId: updated.id,
          metadata: {
            courtId,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async deleteTemplate(userId: string, courtId: string, templateId: string) {
    const template = await this.getOwnedTemplateOrThrow(userId, courtId, templateId);

    return this.prisma.$transaction(async (tx) => {
      await tx.courtScheduleTemplate.delete({
        where: {
          id: template.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_template.deleted',
          targetEntity: 'court_schedule_template',
          targetId: template.id,
          metadata: {
            courtId,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        id: template.id,
      };
    });
  }

  async createException(userId: string, courtId: string, dto: CreateCourtScheduleExceptionDto) {
    const court = await this.getOwnedCourtOrThrow(userId, courtId);
    const normalizedDate = this.normalizeDate(dto.date);
    this.validateExceptionPayload(dto.exceptionType, dto.timeFrom, dto.timeTo, dto.customPrice);

    return this.prisma.$transaction(async (tx) => {
      const exception = await tx.courtScheduleException.create({
        data: {
          courtId: court.id,
          date: normalizedDate,
          exceptionType: dto.exceptionType,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
          customPrice: dto.customPrice,
          comment: dto.comment,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_exception.created',
          targetEntity: 'court_schedule_exception',
          targetId: exception.id,
          metadata: {
            courtId: court.id,
            venueId: court.venueId,
          } as Prisma.InputJsonValue,
        },
      });

      return exception;
    });
  }

  async listExceptions(userId: string, courtId: string) {
    await this.getOwnedCourtOrThrow(userId, courtId);

    return this.prisma.courtScheduleException.findMany({
      where: {
        courtId,
      },
      orderBy: [{ date: 'asc' }, { timeFrom: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateException(
    userId: string,
    courtId: string,
    exceptionId: string,
    dto: UpdateCourtScheduleExceptionDto,
  ) {
    const exception = await this.getOwnedExceptionOrThrow(userId, courtId, exceptionId);
    const nextExceptionType = dto.exceptionType ?? exception.exceptionType;
    const nextTimeFrom = dto.timeFrom === undefined ? exception.timeFrom : dto.timeFrom;
    const nextTimeTo = dto.timeTo === undefined ? exception.timeTo : dto.timeTo;
    const nextCustomPrice =
      dto.customPrice === undefined ? exception.customPrice : dto.customPrice;

    this.validateExceptionPayload(
      nextExceptionType,
      nextTimeFrom ?? undefined,
      nextTimeTo ?? undefined,
      nextCustomPrice === null || nextCustomPrice === undefined
        ? undefined
        : Number(nextCustomPrice),
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.courtScheduleException.update({
        where: {
          id: exception.id,
        },
        data: {
          date: dto.date ? this.normalizeDate(dto.date) : undefined,
          exceptionType: dto.exceptionType,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
          customPrice: dto.customPrice,
          comment: dto.comment,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_exception.updated',
          targetEntity: 'court_schedule_exception',
          targetId: updated.id,
          metadata: {
            courtId,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async deleteException(userId: string, courtId: string, exceptionId: string) {
    const exception = await this.getOwnedExceptionOrThrow(userId, courtId, exceptionId);

    return this.prisma.$transaction(async (tx) => {
      await tx.courtScheduleException.delete({
        where: {
          id: exception.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'court_schedule_exception.deleted',
          targetEntity: 'court_schedule_exception',
          targetId: exception.id,
          metadata: {
            courtId,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        id: exception.id,
      };
    });
  }

  private async getOwnedCourtOrThrow(userId: string, courtId: string) {
    const court = await this.prisma.court.findFirst({
      where: {
        id: courtId,
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
      include: {
        venue: true,
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

  private async getOwnedTemplateOrThrow(userId: string, courtId: string, templateId: string) {
    await this.getOwnedCourtOrThrow(userId, courtId);

    const template = await this.prisma.courtScheduleTemplate.findFirst({
      where: {
        id: templateId,
        courtId,
      },
    });

    if (!template) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.courtScheduleTemplateNotFound,
        message: 'Шаблон расписания корта не найден.',
      });
    }

    return template;
  }

  private async getOwnedExceptionOrThrow(userId: string, courtId: string, exceptionId: string) {
    await this.getOwnedCourtOrThrow(userId, courtId);

    const exception = await this.prisma.courtScheduleException.findFirst({
      where: {
        id: exceptionId,
        courtId,
      },
    });

    if (!exception) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.courtScheduleExceptionNotFound,
        message: 'Исключение расписания корта не найдено.',
      });
    }

    return exception;
  }

  private validateTimeRange(timeFrom: string, timeTo: string, mode: 'template' | 'exception') {
    const start = this.parseTimeToMinutes(timeFrom);
    const end = this.parseTimeToMinutes(timeTo);

    if (start >= end) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message:
          mode === 'template'
            ? 'Проверьте интервал шаблона расписания.'
            : 'Проверьте интервал исключения расписания.',
        fields: {
          timeTo: ['Время окончания должно быть позже времени начала.'],
        },
      });
    }
  }

  private validateExceptionPayload(
    exceptionType: ScheduleExceptionTypeValue,
    timeFrom?: string,
    timeTo?: string,
    customPrice?: number,
  ) {
    const hasTimeFrom = typeof timeFrom === 'string' && timeFrom.length > 0;
    const hasTimeTo = typeof timeTo === 'string' && timeTo.length > 0;

    if (exceptionType === 'closed') {
      if (hasTimeFrom || hasTimeTo) {
        throw new AppError(HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.validation,
          message: 'Для closed-исключения не нужно задавать время.',
        });
      }

      return;
    }

    if (exceptionType === 'custom_hours') {
      if (!hasTimeFrom || !hasTimeTo) {
        throw new AppError(HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.validation,
          message: 'Для custom_hours-исключения нужно указать время начала и окончания.',
        });
      }

      this.validateTimeRange(timeFrom!, timeTo!, 'exception');
      return;
    }

    if (exceptionType === 'blocked') {
      if (hasTimeFrom !== hasTimeTo) {
        throw new AppError(HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.validation,
          message: 'Для blocked-исключения укажите либо оба времени, либо ни одного.',
        });
      }

      if (hasTimeFrom && hasTimeTo) {
        this.validateTimeRange(timeFrom!, timeTo!, 'exception');
      }

      return;
    }

    if (exceptionType === 'custom_price') {
      if (customPrice === undefined || customPrice === null) {
        throw new AppError(HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.validation,
          message: 'Для custom_price-исключения нужно указать цену.',
        });
      }

      if (hasTimeFrom !== hasTimeTo) {
        throw new AppError(HttpStatus.BAD_REQUEST, {
          code: ERROR_CODES.validation,
          message: 'Для custom_price-исключения укажите либо оба времени, либо ни одного.',
        });
      }

      if (hasTimeFrom && hasTimeTo) {
        this.validateTimeRange(timeFrom!, timeTo!, 'exception');
      }
    }
  }

  private normalizeDate(value: string) {
    const normalized = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(normalized.getTime())) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте дату исключения расписания.',
      });
    }

    return normalized;
  }

  private parseTimeToMinutes(value: string) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);

    if (!match) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте время в расписании корта.',
      });
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (hours > 23 || minutes > 59) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте время в расписании корта.',
      });
    }

    return hours * 60 + minutes;
  }
}
