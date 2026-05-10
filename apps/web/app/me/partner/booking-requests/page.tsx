'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../../src/components/ui';
import { apiRequest } from '../../../../src/lib/api';
import {
  formatBookingRequestStatus,
  formatDate,
  formatDateTime,
  formatPartnerVerificationStatus,
  getBookingRequestStatusTone,
  getPartnerVerificationStatusTone,
} from '../../../../src/lib/labels';
import { useDemoSession } from '../../../../src/lib/session';

type PartnerProfile = {
  id: string;
  legalName: string;
  verificationStatus: string;
};

type BookingRequest = {
  id: string;
  status: string;
  bookingDate: string;
  timeFrom: string;
  timeTo: string;
  playersCount: number;
  commentFromPlayer: string | null;
  commentFromPartner: string | null;
  createdAt: string;
  submittedAt: string | null;
  respondedAt: string | null;
  cancelledAt: string | null;
  playerProfile: {
    firstName: string;
    lastName: string;
    user: {
      phone: string;
    } | null;
  };
  venue: {
    name: string;
    address: {
      line1: string;
      city: {
        name: string;
      } | null;
      district: {
        name: string;
      } | null;
    };
  };
  court: {
    name: string;
    surfaceType: string;
  };
};

const emptyComments: Record<string, string> = {};

function formatPlayerName(bookingRequest: BookingRequest) {
  return [bookingRequest.playerProfile.firstName, bookingRequest.playerProfile.lastName]
    .filter(Boolean)
    .join(' ');
}

function canConfirm(status: string) {
  return status === 'pending';
}

function canReject(status: string) {
  return status === 'pending';
}

function canCancel(status: string) {
  return status === 'confirmed';
}

function canComplete(status: string) {
  return status === 'confirmed';
}

function PartnerBookingRequestsContent() {
  const searchParams = useSearchParams();
  const highlightedBookingRequestId = searchParams.get('bookingRequestId');
  const { session, isLoaded } = useDemoSession();
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [comments, setComments] = useState<Record<string, string>>(emptyComments);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);

    const [partnerResponse, bookingResponse] = await Promise.all([
      apiRequest<PartnerProfile | null>('/partner/profile/me', { session }),
      apiRequest<BookingRequest[]>('/partner/booking-requests', { session }),
    ]);

    if (partnerResponse.success) {
      setPartnerProfile(partnerResponse.data ?? null);
    } else if (partnerResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(partnerResponse.error?.message ?? 'Не удалось загрузить профиль партнёра.');
    }

    if (bookingResponse.success && bookingResponse.data) {
      setBookingRequests(bookingResponse.data);
    } else if (bookingResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(bookingResponse.error?.message ?? 'Не удалось загрузить входящие заявки.');
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runAction = async (
    bookingRequestId: string,
    action: 'confirm' | 'reject' | 'cancel' | 'complete',
  ) => {
    if (!session) {
      return;
    }

    setLoadingId(bookingRequestId);
    setMessage(null);
    setError(null);

    const response = await apiRequest<BookingRequest>(
      `/partner/booking-requests/${bookingRequestId}/${action}`,
      {
        method: 'POST',
        session,
        body: JSON.stringify({
          commentFromPartner: comments[bookingRequestId] || undefined,
        }),
      },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось изменить статус заявки.');
      setLoadingId(null);
      return;
    }

    const actionLabels: Record<string, string> = {
      confirm: 'Заявка подтверждена.',
      reject: 'Заявка отклонена.',
      cancel: 'Заявка отменена партнёром.',
      complete: 'Заявка завершена.',
    };

    setMessage(actionLabels[action]);
    setLoadingId(null);
    await loadData();
  };

  return (
    <DemoShell
      title="Входящие заявки на бронь"
      description="Партнёр видит заявки только на свои объекты и переводит их по согласованным статусам: подтвердить, отклонить, отменить, завершить."
    >
      {!isLoaded ? <Notice>Загружаем кабинет партнёра...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите или зарегистрируйтесь по телефону, а затем вернитесь к входящим заявкам.
        </Notice>
      ) : null}
      {session && !partnerProfile ? (
        <Notice kind="error">
          Сначала заполните профиль партнёра на странице <strong>/me/partner</strong>.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {partnerProfile ? (
        <Card accent>
          <div className="card-header-row">
            <h3>Статус партнёра</h3>
            <StatusBadge tone={getPartnerVerificationStatusTone(partnerProfile.verificationStatus)}>
              {formatPartnerVerificationStatus(partnerProfile.verificationStatus)}
            </StatusBadge>
          </div>
          <p className="session-line">
            <strong>Партнёр:</strong> {partnerProfile.legalName}
          </p>
          <p className="muted">
            Сюда попадают только заявки на ваши площадки и корты. Игроки создают их только по
            подтверждённому и активному инвентарю из публичного каталога.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="card-header-row">
          <h3>Входящие заявки</h3>
          <StatusBadge tone="neutral">{bookingRequests.length}</StatusBadge>
        </div>
        {!bookingRequests.length ? (
          <p className="muted">Пока нет входящих заявок на ваши площадки.</p>
        ) : (
          <div className="list-stack">
            {bookingRequests.map((bookingRequest) => (
              <Card
                key={bookingRequest.id}
                className={highlightedBookingRequestId === bookingRequest.id ? 'list-row-highlight' : undefined}
              >
                <div className="card-header-row">
                  <div>
                    <h3>
                      {bookingRequest.venue.name} / {bookingRequest.court.name}
                    </h3>
                    <p className="muted">
                      {formatPlayerName(bookingRequest)} •{' '}
                      {bookingRequest.playerProfile.user?.phone ?? 'Телефон не указан'}
                    </p>
                  </div>
                  <StatusBadge tone={getBookingRequestStatusTone(bookingRequest.status)}>
                    {formatBookingRequestStatus(bookingRequest.status)}
                  </StatusBadge>
                </div>

                <div className="info-list compact-list">
                  <p>
                    {formatDate(bookingRequest.bookingDate)} • {bookingRequest.timeFrom} -{' '}
                    {bookingRequest.timeTo}
                  </p>
                  <p>
                    {bookingRequest.venue.address.city?.name ?? 'Город не указан'}
                    {bookingRequest.venue.address.district?.name
                      ? `, ${bookingRequest.venue.address.district.name}`
                      : ''}
                    {bookingRequest.venue.address.line1
                      ? `, ${bookingRequest.venue.address.line1}`
                      : ''}
                  </p>
                  <p>
                    Игроков: {bookingRequest.playersCount} • Покрытие: {bookingRequest.court.surfaceType}
                  </p>
                  <p>Комментарий игрока: {bookingRequest.commentFromPlayer || 'Не указан'}</p>
                  <p>Ответ партнёра: {bookingRequest.commentFromPartner || 'Пока нет'}</p>
                  <p>Создана: {formatDateTime(bookingRequest.createdAt)}</p>
                </div>

                <label className="field" style={{ marginTop: 16 }}>
                  <span>Комментарий партнёра</span>
                  <textarea
                    value={comments[bookingRequest.id] ?? ''}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [bookingRequest.id]: event.target.value,
                      }))
                    }
                    disabled={loadingId === bookingRequest.id}
                  />
                </label>

                <div className="button-row" style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canConfirm(bookingRequest.status) || loadingId === bookingRequest.id}
                    onClick={() => void runAction(bookingRequest.id, 'confirm')}
                  >
                    Подтвердить
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!canReject(bookingRequest.status) || loadingId === bookingRequest.id}
                    onClick={() => void runAction(bookingRequest.id, 'reject')}
                  >
                    Отклонить
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={!canCancel(bookingRequest.status) || loadingId === bookingRequest.id}
                    onClick={() => void runAction(bookingRequest.id, 'cancel')}
                  >
                    Отменить
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={!canComplete(bookingRequest.status) || loadingId === bookingRequest.id}
                    onClick={() => void runAction(bookingRequest.id, 'complete')}
                  >
                    Завершить
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </DemoShell>
  );
}

export default function PartnerBookingRequestsPage() {
  return (
    <Suspense fallback={<Notice>Загружаем входящие заявки...</Notice>}>
      <PartnerBookingRequestsContent />
    </Suspense>
  );
}
