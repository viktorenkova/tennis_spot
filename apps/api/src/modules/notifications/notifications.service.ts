import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  NotificationRelatedEntityType,
  NotificationType,
  Prisma,
  RoleKey,
} from '@prisma/client';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { PrismaService } from '../../common/prisma/prisma.service';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
const ADMIN_ROLE_KEYS: RoleKey[] = ['admin', 'superadmin'];

export type NotificationRelatedEntity = {
  type: NotificationRelatedEntityType;
  id: string;
};

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    relatedEntity?: NotificationRelatedEntity,
    client: PrismaClientLike = this.prisma,
  ) {
    return client.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        relatedEntityType: relatedEntity?.type,
        relatedEntityId: relatedEntity?.id,
      },
    });
  }

  async createNotificationsForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    relatedEntity?: NotificationRelatedEntity,
    client: PrismaClientLike = this.prisma,
  ) {
    const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);

    return Promise.all(
      uniqueUserIds.map((userId) =>
        this.createNotification(userId, type, title, body, relatedEntity, client),
      ),
    );
  }

  getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new AppError(HttpStatus.NOT_FOUND, {
        code: ERROR_CODES.notificationNotFound,
        message: 'Уведомление не найдено.',
      });
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      updatedCount: result.count,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return {
      count,
    };
  }

  async getAdminUserIds(client: PrismaClientLike = this.prisma) {
    const admins = await client.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              key: {
                in: ADMIN_ROLE_KEYS,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    return admins.map((admin) => admin.id);
  }
}
