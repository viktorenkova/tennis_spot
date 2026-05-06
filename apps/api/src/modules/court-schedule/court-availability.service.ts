import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BookingRequestStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';

type AvailabilitySlot = {
  timeFrom: string;
  timeTo: string;
  slotDurationMinutes: number;
  isAvailable: boolean;
  price: Prisma.Decimal | number | null;
  reason: string | null;
};

type AvailabilityResult = {
  courtId: string;
  date: string;
  isAvailable: boolean;
  reason: string | null;
  intervals: AvailabilitySlot[];
};

const CONFLICT_BOOKING_STATUSES: BookingRequestStatus[] = ['pending', 'confirmed'];

@Injectable()
export class CourtAvailabilityService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getPublicCourtAvailability(courtId: string, date: string) {
    const court = await this.prisma.court.findUnique({
      where: {
        id: courtId,
      },
      include: {
        venue: {
          include: {
            partnerProfile: true,
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

    if (
      !court.isActive ||
      !court.venue.isActive ||
      court.venue.partnerProfile.verificationStatus !== 'verified'
    ) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.courtNotFound,
        message: 'Корт не найден.',
      });
    }

    return this.buildAvailability(court.id, date);
  }

  async ensureCourtBookableInterval(
    courtId: string,
    date: string,
    timeFrom: string,
    timeTo: string,
    options?: {
      ignoreBookingRequestId?: string;
    },
  ) {
    const availability = await this.buildAvailability(courtId, date, options);

    const matchingInterval = this.findMatchingInterval(availability.intervals, timeFrom, timeTo);

    if (matchingInterval) {
      return availability;
    }

    throw new AppError(HttpStatus.CONFLICT, {
      code: ERROR_CODES.bookingRequestUnavailableCourt,
      message:
        availability.reason === 'no_schedule'
          ? 'На выбранную дату у корта нет настроенного расписания.'
          : 'Выбранный интервал недоступен для бронирования.',
      fields: {
        timeFrom: ['Выберите доступный интервал из расписания корта.'],
      },
    });
  }

  findMatchingInterval(
    intervals: Array<{
      timeFrom: string;
      timeTo: string;
      slotDurationMinutes: number;
      isAvailable: boolean;
      price: Prisma.Decimal | number | null;
    }>,
    timeFrom: string,
    timeTo: string,
  ) {
    const requestedStart = this.parseTimeToMinutes(timeFrom);
    const requestedEnd = this.parseTimeToMinutes(timeTo);

    if (requestedEnd <= requestedStart) {
      return null;
    }

    const sortedIntervals = [...intervals].sort((left, right) =>
      left.timeFrom.localeCompare(right.timeFrom),
    );

    let cursor = requestedStart;
    let totalPrice: Prisma.Decimal | null = null;
    let hasMissingPrice = false;
    let slotDurationMinutes: number | null = null;

    while (cursor < requestedEnd) {
      const currentTime = this.formatMinutes(cursor);
      const nextInterval = sortedIntervals.find(
        (interval) => interval.timeFrom === currentTime && interval.isAvailable,
      );

      if (!nextInterval) {
        return null;
      }

      const intervalStart = this.parseTimeToMinutes(nextInterval.timeFrom);
      const intervalEnd = this.parseTimeToMinutes(nextInterval.timeTo);

      if (intervalStart !== cursor || intervalEnd > requestedEnd) {
        return null;
      }

      slotDurationMinutes = slotDurationMinutes
        ? Math.min(slotDurationMinutes, nextInterval.slotDurationMinutes)
        : nextInterval.slotDurationMinutes;

      if (nextInterval.price === null) {
        hasMissingPrice = true;
      } else if (!hasMissingPrice) {
        const nextPrice = new Prisma.Decimal(nextInterval.price);
        totalPrice = totalPrice ? totalPrice.add(nextPrice) : nextPrice;
      }

      cursor = intervalEnd;
    }

    if (cursor !== requestedEnd) {
      return null;
    }

    return {
      timeFrom,
      timeTo,
      slotDurationMinutes: slotDurationMinutes ?? requestedEnd - requestedStart,
      price: hasMissingPrice ? null : totalPrice,
      isAvailable: true,
      reason: null,
    };
  }

  async buildAvailability(
    courtId: string,
    date: string,
    options?: {
      ignoreBookingRequestId?: string;
    },
  ): Promise<AvailabilityResult> {
    const normalizedDate = this.normalizeDate(date);
    const weekday = this.getWeekday(normalizedDate);

    const court = await this.prisma.court.findUnique({
      where: {
        id: courtId,
      },
      include: {
        venue: {
          include: {
            partnerProfile: true,
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

    if (!court.isActive) {
      return {
        courtId,
        date,
        isAvailable: false,
        reason: 'inactive_court',
        intervals: [],
      };
    }

    if (!court.venue.isActive) {
      return {
        courtId,
        date,
        isAvailable: false,
        reason: 'inactive_venue',
        intervals: [],
      };
    }

    const [templates, exceptions, conflictingBookings] = await Promise.all([
      this.prisma.courtScheduleTemplate.findMany({
        where: {
          courtId,
          weekday,
        },
        orderBy: [{ timeFrom: 'asc' }, { timeTo: 'asc' }],
      }),
      this.prisma.courtScheduleException.findMany({
        where: {
          courtId,
          date: normalizedDate,
        },
        orderBy: [{ timeFrom: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.bookingRequest.findMany({
        where: {
          courtId,
          bookingDate: normalizedDate,
          status: {
            in: CONFLICT_BOOKING_STATUSES,
          },
          ...(options?.ignoreBookingRequestId
            ? {
                id: {
                  not: options.ignoreBookingRequestId,
                },
              }
            : {}),
        },
        orderBy: {
          timeFrom: 'asc',
        },
      }),
    ]);

    const openTemplates = templates.filter((template) => template.isOpen);
    const closedTemplates = templates.filter((template) => !template.isOpen);
    const slotDurationMinutes = this.resolveSlotDurationMinutes(openTemplates);

    if (!openTemplates.length || !slotDurationMinutes) {
      return {
        courtId,
        date,
        isAvailable: false,
        reason: 'no_schedule',
        intervals: [],
      };
    }

    if (exceptions.some((exception) => exception.exceptionType === 'closed')) {
      return {
        courtId,
        date,
        isAvailable: false,
        reason: 'closed',
        intervals: [],
      };
    }

    const customHoursExceptions = exceptions.filter(
      (exception) => exception.exceptionType === 'custom_hours',
    );

    const baseIntervals = customHoursExceptions.length
      ? customHoursExceptions.flatMap((exception) =>
          this.generateSlots(
            exception.timeFrom!,
            exception.timeTo!,
            slotDurationMinutes,
            null,
          ),
        )
      : openTemplates.flatMap((template) =>
          this.generateSlots(
            template.timeFrom,
            template.timeTo,
            template.slotDurationMinutes,
            template.basePrice ?? null,
          ),
        );

    const intervals = this.uniqueIntervals(baseIntervals);

    if (!customHoursExceptions.length) {
      for (const template of closedTemplates) {
        this.markOverlappingIntervals(intervals, template.timeFrom, template.timeTo, 'weekly_closed');
      }
    }

    for (const exception of exceptions) {
      if (exception.exceptionType === 'blocked') {
        if (!exception.timeFrom || !exception.timeTo) {
          intervals.forEach((interval) => {
            interval.isAvailable = false;
            interval.reason = interval.reason ?? 'blocked';
          });
          continue;
        }

        this.markOverlappingIntervals(intervals, exception.timeFrom, exception.timeTo, 'blocked');
      }

      if (exception.exceptionType === 'custom_price') {
        this.applyCustomPrice(intervals, exception);
      }
    }

    for (const booking of conflictingBookings) {
      this.markOverlappingIntervals(intervals, booking.timeFrom, booking.timeTo, 'booking_conflict');
    }

    const availableIntervals = intervals.filter((interval) => interval.isAvailable);

    return {
      courtId,
      date,
      isAvailable: availableIntervals.length > 0,
      reason: availableIntervals.length > 0 ? null : this.resolveUnavailableReason(intervals),
      intervals,
    };
  }

  private uniqueIntervals(intervals: AvailabilitySlot[]) {
    const unique = new Map<string, AvailabilitySlot>();

    for (const interval of intervals) {
      unique.set(`${interval.timeFrom}-${interval.timeTo}`, interval);
    }

    return Array.from(unique.values()).sort((left, right) =>
      left.timeFrom.localeCompare(right.timeFrom),
    );
  }

  private generateSlots(
    timeFrom: string,
    timeTo: string,
    slotDurationMinutes: number,
    price: Prisma.Decimal | number | null,
  ) {
    const slots: AvailabilitySlot[] = [];
    let cursor = this.parseTimeToMinutes(timeFrom);
    const end = this.parseTimeToMinutes(timeTo);

    while (cursor + slotDurationMinutes <= end) {
      slots.push({
        timeFrom: this.formatMinutes(cursor),
        timeTo: this.formatMinutes(cursor + slotDurationMinutes),
        slotDurationMinutes,
        isAvailable: true,
        price,
        reason: null,
      });

      cursor += slotDurationMinutes;
    }

    return slots;
  }

  private markOverlappingIntervals(
    intervals: AvailabilitySlot[],
    timeFrom: string,
    timeTo: string,
    reason: string,
  ) {
    const blockedStart = this.parseTimeToMinutes(timeFrom);
    const blockedEnd = this.parseTimeToMinutes(timeTo);

    for (const interval of intervals) {
      const intervalStart = this.parseTimeToMinutes(interval.timeFrom);
      const intervalEnd = this.parseTimeToMinutes(interval.timeTo);

      if (intervalStart < blockedEnd && blockedStart < intervalEnd) {
        interval.isAvailable = false;
        interval.reason = interval.reason ?? reason;
      }
    }
  }

  private applyCustomPrice(
    intervals: AvailabilitySlot[],
    exception: {
      timeFrom: string | null;
      timeTo: string | null;
      customPrice: Prisma.Decimal | null;
    },
  ) {
    if (exception.customPrice === null) {
      return;
    }

    if (!exception.timeFrom || !exception.timeTo) {
      intervals.forEach((interval) => {
        interval.price = exception.customPrice;
      });
      return;
    }

    const start = this.parseTimeToMinutes(exception.timeFrom);
    const end = this.parseTimeToMinutes(exception.timeTo);

    for (const interval of intervals) {
      const intervalStart = this.parseTimeToMinutes(interval.timeFrom);
      const intervalEnd = this.parseTimeToMinutes(interval.timeTo);

      if (intervalStart < end && start < intervalEnd) {
        interval.price = exception.customPrice;
      }
    }
  }

  private resolveUnavailableReason(intervals: AvailabilitySlot[]) {
    if (!intervals.length) {
      return 'no_schedule';
    }

    if (intervals.every((interval) => interval.reason === 'booking_conflict')) {
      return 'booking_conflict';
    }

    if (intervals.every((interval) => interval.reason === 'blocked')) {
      return 'blocked';
    }

    if (intervals.every((interval) => interval.reason === 'weekly_closed')) {
      return 'weekly_closed';
    }

    return intervals.find((interval) => interval.reason)?.reason ?? 'unavailable';
  }

  private resolveSlotDurationMinutes(
    templates: Array<{
      slotDurationMinutes: number;
    }>,
  ) {
    if (!templates.length) {
      return null;
    }

    return Math.min(...templates.map((template) => template.slotDurationMinutes));
  }

  private normalizeDate(value: string) {
    const normalized = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(normalized.getTime())) {
      throw new AppError(HttpStatus.BAD_REQUEST, {
        code: ERROR_CODES.validation,
        message: 'Проверьте дату расписания корта.',
        fields: {
          date: ['Дата должна быть корректной.'],
        },
      });
    }

    return normalized;
  }

  private getWeekday(date: Date) {
    return date.getUTCDay();
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

  private formatMinutes(value: number) {
    const hours = Math.floor(value / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (value % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }
}
