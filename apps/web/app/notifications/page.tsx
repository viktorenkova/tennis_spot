'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import { formatDateTime, formatNotificationType } from '../../src/lib/labels';
import { resolveNotificationLink } from '../../src/lib/notification-links';
import { useDemoSession } from '../../src/lib/session';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType: 'verification_request' | 'booking_request' | 'match_request' | 'complaint' | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

type UnreadCount = {
  count: number;
};

type ReadAllResult = {
  updatedCount: number;
};

export default function NotificationsPage() {
  const { session, isLoaded } = useDemoSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isReadingAll, setIsReadingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);

    const [notificationsResponse, countResponse] = await Promise.all([
      apiRequest<NotificationItem[]>('/notifications', { session }),
      apiRequest<UnreadCount>('/notifications/unread-count', { session }),
    ]);

    if (notificationsResponse.success && notificationsResponse.data) {
      setNotifications(notificationsResponse.data);
    } else {
      setError(
        notificationsResponse.error?.message ?? 'Не удалось загрузить уведомления.',
      );
    }

    if (countResponse.success && countResponse.data) {
      setUnreadCount(countResponse.data.count);
    }
  }, [session]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(notificationId: string) {
    if (!session) {
      return;
    }

    setLoadingId(notificationId);
    setError(null);
    setMessage(null);

    const response = await apiRequest<NotificationItem>(`/notifications/${notificationId}/read`, {
      method: 'POST',
      session,
    });

    setLoadingId(null);

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось отметить уведомление прочитанным.');
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === response.data?.id ? response.data : notification,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    setMessage('Уведомление отмечено как прочитанное.');
  }

  async function markAllAsRead() {
    if (!session) {
      return;
    }

    setIsReadingAll(true);
    setError(null);
    setMessage(null);

    const response = await apiRequest<ReadAllResult>('/notifications/read-all', {
      method: 'POST',
      session,
    });

    setIsReadingAll(false);

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось отметить уведомления прочитанными.');
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    setMessage(
      `Прочитано уведомлений: ${response.data?.updatedCount ?? 0}.`,
    );
  }

  return (
    <DemoShell
      title="Уведомления"
      description="Системные события внутри приложения: верификация, заявки на бронь и изменения статусов."
    >
      {!isLoaded ? <Notice>Проверяем текущую демо-сессию...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала выберите демо-аккаунт на странице входа, чтобы увидеть свои уведомления.
        </Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}

      <Card accent>
        <div className="section-heading">
          <div>
            <h3>Центр уведомлений</h3>
            <p>
              Непрочитанные уведомления помогают не пропустить новые заявки и решения по
              верификации.
            </p>
          </div>
          <StatusBadge tone={unreadCount > 0 ? 'warning' : 'success'}>
            {unreadCount} непрочитано
          </StatusBadge>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadNotifications()}
            disabled={!session}
          >
            Обновить
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => void markAllAsRead()}
            disabled={!session || unreadCount === 0 || isReadingAll}
          >
            {isReadingAll ? 'Отмечаем...' : 'Прочитать всё'}
          </button>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>Список уведомлений</h3>
          <StatusBadge tone="neutral">{notifications.length}</StatusBadge>
        </div>

        {notifications.length === 0 ? (
          <p className="muted">Пока нет уведомлений. Они появятся после бронирований, вызовов, жалоб или проверки профиля.</p>
        ) : (
          <div className="list-stack">
            {notifications.map((notification) => {
              const target = resolveNotificationLink(notification, session);

              return (
                <article
                  key={notification.id}
                  className={`list-row list-row-detailed${notification.isRead ? '' : ' list-row-highlight'}`}
                >
                  <div>
                    <div className="row-title">
                      <strong>{notification.title}</strong>
                    </div>
                    <p>{notification.body}</p>
                    <p className="muted">
                      Создано: {formatDateTime(notification.createdAt)} · Событие:{' '}
                      {formatNotificationType(notification.type)}
                    </p>
                    {target ? (
                      <Link
                        href={target.href}
                        className="inline-link"
                        onClick={() => {
                          if (!notification.isRead) {
                            void markAsRead(notification.id);
                          }
                        }}
                      >
                        {target.label}
                      </Link>
                    ) : null}
                  </div>
                  <div className="notification-actions">
                    <StatusBadge tone={notification.isRead ? 'neutral' : 'warning'}>
                      {notification.isRead ? 'Прочитано' : 'Новое'}
                    </StatusBadge>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void markAsRead(notification.id)}
                      disabled={notification.isRead || loadingId === notification.id}
                    >
                      {loadingId === notification.id ? 'Сохраняем...' : 'Прочитать'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </DemoShell>
  );
}
