import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
        },
      };
    } catch (error) {
      throw new AppError(HttpStatus.SERVICE_UNAVAILABLE, {
        code: ERROR_CODES.databaseUnavailable,
        message: 'Подключение к базе данных недоступно.',
        meta: {
          service: 'database',
          details: error instanceof Error ? error.message : 'Неизвестная ошибка базы данных.',
        },
      });
    }
  }
}
