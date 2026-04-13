'use client';

import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import {
  formatBookingRequestStatus,
  formatDate,
  formatDateTime,
  getBookingRequestStatusTone,
} from '../../src/lib/labels';
import { useDemoSession } from '../../src/lib/session';

type City = {
  id: string;
  name: string;
};

type District = {
  id: string;
  name: string;
};

type PublicCourt = {
  id: string;
  name: string;
  surfaceType: string;
  isIndoor: boolean;
};

type PublicVenue = {
  id: string;
  name: string;
  address: {
    line1: string;
    city: City | null;
    district: District | null;
  };
  courts: PublicCourt[];
  partnerProfile: {
    legalName: string;
    brandName: string | null;
  };
};

type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
};

type BookingRequestListItem = {
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
  venue: {
    id: string;
    name: string;
    address: {
      line1: string;
      city: City | null;
      district: District | null;
    };
  };
  court: {
    id: string;
    name: string;
    surfaceType: string;
  };
};

type BookingRequestDetails = BookingRequestListItem & {
  partnerProfile: {
    legalName: string;
    brandName: string | null;
  };
  statusHistory: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    comment: string | null;
    createdAt: string;
    changedByUser: {
      phone: string;
    } | null;
  }>;
};

type CourtAvailabilityInterval = {
  timeFrom: string;
  timeTo: string;
  slotDurationMinutes: number;
  isAvailable: boolean;
  price: number | string | null;
  reason: string | null;
};

type CourtAvailability = {
  courtId: string;
  date: string;
  isAvailable: boolean;
  reason: string | null;
  intervals: CourtAvailabilityInterval[];
};

type BookingForm = {
  venueId: string;
  courtId: string;
  bookingDate: string;
  timeFrom: string;
  timeTo: string;
  playersCount: string;
  commentFromPlayer: string;
};

const initialForm: BookingForm = {
  venueId: '',
  courtId: '',
  bookingDate: '',
  timeFrom: '',
  timeTo: '',
  playersCount: '2',
  commentFromPlayer: '',
};

function getVenueLabel(venue: PublicVenue) {
  const parts = [venue.address.city?.name, venue.address.district?.name, venue.address.line1].filter(
    Boolean,
  );

  return parts.join(', ');
}

function getAvailabilityReasonLabel(reason: string | null) {
  switch (reason) {
    case 'no_schedule':
      return 'На эту дату у корта ещё нет рабочего расписания.';
    case 'closed':
      return 'На выбранную дату корт закрыт целиком.';
    case 'blocked':
      return 'На эту дату интервал заблокирован партнёром.';
    case 'weekly_closed':
      return 'На этот день недели корт закрыт по базовому расписанию.';
    case 'booking_conflict':
      return 'На этот интервал уже есть активная заявка.';
    case 'inactive_court':
      return 'Корт сейчас недоступен для бронирования.';
    case 'inactive_venue':
      return 'Площадка сейчас недоступна для бронирования.';
    default:
      return 'Проверьте доступные интервалы и выберите валидное время.';
  }
}

function formatPrice(price: number | string | null) {
  if (price === null || price === '') {
    return null;
  }

  const numeric = typeof price === 'number' ? price : Number(price);

  if (Number.isNaN(numeric)) {
    return String(price);
  }

  return `${numeric.toLocaleString('ru-RU')} ₽`;
}

export default function BookingRequestsPage() {
  const { session, isLoaded } = useDemoSession();
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestListItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequestDetails | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingForm>(initialForm);
  const [availability, setAvailability] = useState<CourtAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);

  const selectedVenue = venues.find((venue) => venue.id === bookingForm.venueId) ?? null;
  const availableCourts = selectedVenue?.courts ?? [];
  const availableIntervals = availability?.intervals.filter((interval) => interval.isAvailable) ?? [];
  const hasSelectedInterval = availableIntervals.some(
    (interval) =>
      interval.timeFrom === bookingForm.timeFrom && interval.timeTo === bookingForm.timeTo,
  );

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);

    const [playerResponse, venuesResponse, bookingRequestsResponse] = await Promise.all([
      apiRequest<PlayerProfile | null>('/player/profile/me', { session }),
      apiRequest<PublicVenue[]>('/venues'),
      apiRequest<BookingRequestListItem[]>('/booking-requests/me', { session }),
    ]);

    if (playerResponse.success) {
      setPlayerProfile(playerResponse.data ?? null);
    } else if (playerResponse.error?.code !== 'PLAYER_PROFILE_NOT_FOUND') {
      setError(playerResponse.error?.message ?? 'Не удалось загрузить профиль игрока.');
    }

    if (venuesResponse.success && venuesResponse.data) {
      const venuesData = venuesResponse.data;
      setVenues(venuesData);
      setBookingForm((current) => {
        const nextVenueId =
          current.venueId && venuesData.some((venue) => venue.id === current.venueId)
            ? current.venueId
            : venuesData[0]?.id ?? '';
        const nextVenue = venuesData.find((venue) => venue.id === nextVenueId) ?? null;
        const nextCourtId =
          current.courtId && nextVenue?.courts.some((court) => court.id === current.courtId)
            ? current.courtId
            : nextVenue?.courts[0]?.id ?? '';

        return {
          ...current,
          venueId: nextVenueId,
          courtId: nextCourtId,
        };
      });
    } else {
      setVenues([]);
      setError(venuesResponse.error?.message ?? 'Не удалось загрузить публичный каталог площадок.');
    }

    if (bookingRequestsResponse.success && bookingRequestsResponse.data) {
      setBookingRequests(bookingRequestsResponse.data);
    } else if (bookingRequestsResponse.error?.code !== 'PLAYER_PROFILE_NOT_FOUND') {
      setError(bookingRequestsResponse.error?.message ?? 'Не удалось загрузить заявки игрока.');
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!bookingForm.courtId || !bookingForm.bookingDate) {
      setAvailability(null);
      setAvailabilityError(null);
      return;
    }

    const courtId = bookingForm.courtId;
    const bookingDate = bookingForm.bookingDate;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError(null);

      const response = await apiRequest<CourtAvailability>(
        `/courts/${courtId}/availability?date=${bookingDate}`,
      );

      if (!response.success || !response.data) {
        setAvailability(null);
        setAvailabilityError(response.error?.message ?? 'Не удалось получить доступность корта.');
        setAvailabilityLoading(false);
        return;
      }

      const nextAvailability = response.data;
      const nextAvailableIntervals = nextAvailability.intervals.filter((interval) => interval.isAvailable);

      setAvailability(nextAvailability);
      setBookingForm((current) => {
        if (current.courtId !== courtId || current.bookingDate !== bookingDate) {
          return current;
        }

        const hasCurrentInterval = nextAvailableIntervals.some(
          (interval) =>
            interval.timeFrom === current.timeFrom && interval.timeTo === current.timeTo,
        );

        if (hasCurrentInterval || !nextAvailableIntervals.length) {
          return current;
        }

        return {
          ...current,
          timeFrom: nextAvailableIntervals[0].timeFrom,
          timeTo: nextAvailableIntervals[0].timeTo,
        };
      });
      setAvailabilityLoading(false);
    };

    void loadAvailability();
  }, [bookingForm.bookingDate, bookingForm.courtId]);

  const loadDetails = async (bookingRequestId: string) => {
    if (!session) {
      return;
    }

    setDetailsLoadingId(bookingRequestId);
    setError(null);

    const response = await apiRequest<BookingRequestDetails>(`/booking-requests/${bookingRequestId}`, {
      session,
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось загрузить детали заявки.');
      setDetailsLoadingId(null);
      return;
    }

    setSelectedBooking(response.data);
    setDetailsLoadingId(null);
  };

  const saveBookingRequest = async () => {
    if (!session || !hasSelectedInterval) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<BookingRequestDetails>('/booking-requests', {
      method: 'POST',
      session,
      body: JSON.stringify({
        venueId: bookingForm.venueId,
        courtId: bookingForm.courtId,
        bookingDate: bookingForm.bookingDate,
        timeFrom: bookingForm.timeFrom,
        timeTo: bookingForm.timeTo,
        playersCount: Number(bookingForm.playersCount || 0),
        commentFromPlayer: bookingForm.commentFromPlayer || undefined,
      }),
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось создать заявку на бронирование.');
      setLoading(false);
      return;
    }

    setMessage('Заявка на бронирование отправлена партнёру.');
    setSelectedBooking(response.data);
    setBookingForm((current) => ({
      ...current,
      playersCount: '2',
      commentFromPlayer: '',
    }));
    setLoading(false);
    await loadData();
  };

  const cancelBookingRequest = async (bookingRequestId: string) => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<BookingRequestDetails>(`/booking-requests/${bookingRequestId}/cancel`, {
      method: 'POST',
      session,
      body: JSON.stringify({}),
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось отменить заявку.');
      setLoading(false);
      return;
    }

    setMessage('Заявка отменена.');
    setSelectedBooking(response.data);
    setLoading(false);
    await loadData();
  };

  const canSubmit =
    Boolean(session) &&
    Boolean(playerProfile) &&
    Boolean(bookingForm.venueId) &&
    Boolean(bookingForm.courtId) &&
    Boolean(bookingForm.bookingDate) &&
    !availabilityLoading &&
    hasSelectedInterval &&
    !loading;

  return (
    <DemoShell
      title="Заявки игрока на бронь"
      description="Игрок выбирает подтверждённую и активную площадку, видит расписание выбранного корта на дату и отправляет заявку партнёру."
    >
      {!isLoaded ? <Notice>Загружаем кабинет игрока...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите через страницу демо-входа, а затем вернитесь к заявкам на бронь.
        </Notice>
      ) : null}
      {session && !playerProfile ? (
        <Notice kind="error">
          Сначала заполните профиль игрока на странице <strong>/me/player</strong>, после этого можно
          создавать booking requests.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <h3>Новая заявка</h3>
          {!venues.length ? (
            <Notice kind="error">
              В публичном каталоге пока нет доступных площадок. Проверьте, что партнёр прошёл
              verification и площадка остаётся active.
            </Notice>
          ) : null}

          <div className="form-stack">
            <label className="field">
              <span>Площадка</span>
              <select
                value={bookingForm.venueId}
                onChange={(event) => {
                  const nextVenueId = event.target.value;
                  const nextVenue = venues.find((venue) => venue.id === nextVenueId) ?? null;

                  setBookingForm((current) => ({
                    ...current,
                    venueId: nextVenueId,
                    courtId: nextVenue?.courts[0]?.id ?? '',
                    timeFrom: '',
                    timeTo: '',
                  }));
                }}
                disabled={!session || !playerProfile || !venues.length || loading}
              >
                <option value="">Выберите площадку</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name} — {getVenueLabel(venue)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Корт</span>
              <select
                value={bookingForm.courtId}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    courtId: event.target.value,
                    timeFrom: '',
                    timeTo: '',
                  }))
                }
                disabled={!session || !playerProfile || !availableCourts.length || loading}
              >
                <option value="">Выберите корт</option>
                {availableCourts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} — {court.surfaceType} {court.isIndoor ? '(indoor)' : '(outdoor)'}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Дата</span>
              <input
                type="date"
                value={bookingForm.bookingDate}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    bookingDate: event.target.value,
                    timeFrom: '',
                    timeTo: '',
                  }))
                }
                disabled={!session || !playerProfile || loading}
              />
            </label>

            <div className="split-grid">
              <label className="field">
                <span>С</span>
                <input
                  type="time"
                  value={bookingForm.timeFrom}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, timeFrom: event.target.value }))
                  }
                  disabled={!session || !playerProfile || loading}
                />
              </label>

              <label className="field">
                <span>До</span>
                <input
                  type="time"
                  value={bookingForm.timeTo}
                  onChange={(event) =>
                    setBookingForm((current) => ({ ...current, timeTo: event.target.value }))
                  }
                  disabled={!session || !playerProfile || loading}
                />
              </label>
            </div>

            <label className="field">
              <span>Количество игроков</span>
              <input
                type="number"
                min="1"
                max="8"
                value={bookingForm.playersCount}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, playersCount: event.target.value }))
                }
                disabled={!session || !playerProfile || loading}
              />
            </label>

            <label className="field">
              <span>Комментарий игрока</span>
              <textarea
                value={bookingForm.commentFromPlayer}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    commentFromPlayer: event.target.value,
                  }))
                }
                disabled={!session || !playerProfile || loading}
              />
            </label>
          </div>

          <div className="action-row" style={{ marginTop: 20 }}>
            <div>
              <h3>Что важно</h3>
              <p className="muted">
                Игрок не резервирует слот мгновенно. Он отправляет заявку на подтверждение партнёру,
                а система сначала проверяет расписание и пересечения по времени на выбранном корте.
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={saveBookingRequest}
              disabled={!canSubmit}
            >
              {loading ? 'Отправляем...' : 'Создать заявку'}
            </button>
          </div>
        </Card>

        <Card>
          <h3>Публичный каталог для брони</h3>
          {!selectedVenue ? (
            <p className="muted">Выберите площадку, чтобы увидеть её доступные корты.</p>
          ) : (
            <div className="info-list">
              <p>
                <strong>Площадка:</strong> {selectedVenue.name}
              </p>
              <p>
                <strong>Партнёр:</strong>{' '}
                {selectedVenue.partnerProfile.brandName || selectedVenue.partnerProfile.legalName}
              </p>
              <p>
                <strong>Адрес:</strong> {getVenueLabel(selectedVenue)}
              </p>
              <p>
                <strong>Кортов в каталоге:</strong> {selectedVenue.courts.length}
              </p>
            </div>
          )}

          <div className="info-list" style={{ marginTop: 16 }}>
            <p>
              <strong>Доступность по дате:</strong>{' '}
              {bookingForm.bookingDate ? formatDate(bookingForm.bookingDate) : 'Сначала выберите дату'}
            </p>
          </div>

          {availabilityLoading ? <Notice>Проверяем расписание корта...</Notice> : null}
          {availabilityError ? <Notice kind="error">{availabilityError}</Notice> : null}
          {availability && !availabilityLoading ? (
            <>
              {!availability.isAvailable ? (
                <Notice kind="error">{getAvailabilityReasonLabel(availability.reason)}</Notice>
              ) : (
                <Notice kind="success">
                  Корт доступен. Выберите один из допустимых интервалов ниже или оставьте уже
                  подставленный.
                </Notice>
              )}

              {availability.intervals.length ? (
                <div className="list-stack" style={{ marginTop: 16 }}>
                  {availability.intervals.map((interval) => {
                    const isSelected =
                      interval.timeFrom === bookingForm.timeFrom && interval.timeTo === bookingForm.timeTo;

                    return (
                      <button
                        key={`${interval.timeFrom}-${interval.timeTo}`}
                        type="button"
                        className="list-row list-row-detailed"
                        onClick={() =>
                          interval.isAvailable
                            ? setBookingForm((current) => ({
                                ...current,
                                timeFrom: interval.timeFrom,
                                timeTo: interval.timeTo,
                              }))
                            : undefined
                        }
                        disabled={!interval.isAvailable}
                        style={{
                          borderColor: isSelected ? 'rgba(177, 120, 51, 0.6)' : undefined,
                          opacity: interval.isAvailable ? 1 : 0.68,
                          cursor: interval.isAvailable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <div>
                          <strong>
                            {interval.timeFrom} - {interval.timeTo}
                          </strong>
                          <span>
                            Слот {interval.slotDurationMinutes} мин
                            {formatPrice(interval.price) ? ` • ${formatPrice(interval.price)}` : ''}
                          </span>
                          <span>
                            {interval.isAvailable
                              ? 'Интервал доступен для заявки на бронь.'
                              : getAvailabilityReasonLabel(interval.reason)}
                          </span>
                        </div>
                        <StatusBadge tone={interval.isAvailable ? 'success' : 'danger'}>
                          {interval.isAvailable ? 'Доступно' : 'Недоступно'}
                        </StatusBadge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 16 }}>
                  Для этой даты нет доступных интервалов.
                </p>
              )}

              {!hasSelectedInterval && bookingForm.timeFrom && bookingForm.timeTo ? (
                <Notice kind="error" title="Интервал не подходит">
                  Выбранный диапазон не совпадает с валидными слотами из расписания. Выберите
                  доступный интервал из списка.
                </Notice>
              ) : null}
            </>
          ) : null}
        </Card>
      </div>

      <Card>
        <div className="card-header-row">
          <h3>Мои заявки</h3>
          <StatusBadge tone="neutral">{bookingRequests.length}</StatusBadge>
        </div>
        {!bookingRequests.length ? (
          <p className="muted">Пока нет заявок. Создайте первую заявку через форму выше.</p>
        ) : (
          <div className="list-stack">
            {bookingRequests.map((bookingRequest) => (
              <div key={bookingRequest.id} className="list-row list-row-detailed">
                <div>
                  <strong>
                    {bookingRequest.venue.name} / {bookingRequest.court.name}
                  </strong>
                  <span>
                    {formatDate(bookingRequest.bookingDate)} • {bookingRequest.timeFrom} -{' '}
                    {bookingRequest.timeTo}
                  </span>
                  <span>
                    {bookingRequest.venue.address.city?.name ?? 'Город не указан'}
                    {bookingRequest.venue.address.district?.name
                      ? `, ${bookingRequest.venue.address.district.name}`
                      : ''}
                    {bookingRequest.venue.address.line1
                      ? `, ${bookingRequest.venue.address.line1}`
                      : ''}
                  </span>
                  <span>
                    Игроков: {bookingRequest.playersCount}
                    {bookingRequest.commentFromPartner
                      ? ` • Комментарий партнёра: ${bookingRequest.commentFromPartner}`
                      : ''}
                  </span>
                </div>
                <div className="button-row">
                  <StatusBadge tone={getBookingRequestStatusTone(bookingRequest.status)}>
                    {formatBookingRequestStatus(bookingRequest.status)}
                  </StatusBadge>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void loadDetails(bookingRequest.id)}
                    disabled={detailsLoadingId === bookingRequest.id}
                  >
                    {detailsLoadingId === bookingRequest.id ? 'Загрузка...' : 'Детали'}
                  </button>
                  {bookingRequest.status === 'pending' || bookingRequest.status === 'confirmed' ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void cancelBookingRequest(bookingRequest.id)}
                      disabled={loading}
                    >
                      Отменить
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedBooking ? (
        <Card>
          <div className="card-header-row">
            <div>
              <h3>Детали заявки</h3>
              <p className="muted">
                {selectedBooking.venue.name} / {selectedBooking.court.name}
              </p>
            </div>
            <StatusBadge tone={getBookingRequestStatusTone(selectedBooking.status)}>
              {formatBookingRequestStatus(selectedBooking.status)}
            </StatusBadge>
          </div>

          <div className="info-list">
            <p>
              <strong>Партнёр:</strong>{' '}
              {selectedBooking.partnerProfile.brandName || selectedBooking.partnerProfile.legalName}
            </p>
            <p>
              <strong>Когда создана:</strong> {formatDateTime(selectedBooking.createdAt)}
            </p>
            <p>
              <strong>Когда отправлена:</strong> {formatDateTime(selectedBooking.submittedAt)}
            </p>
            <p>
              <strong>Ответ партнёра:</strong> {formatDateTime(selectedBooking.respondedAt)}
            </p>
            <p>
              <strong>Отмена:</strong> {formatDateTime(selectedBooking.cancelledAt)}
            </p>
          </div>

          <div className="info-list compact-list" style={{ marginTop: 16 }}>
            {selectedBooking.statusHistory.map((entry) => (
              <p key={entry.id}>
                {formatDateTime(entry.createdAt)} • {entry.oldStatus ?? 'draft'} → {entry.newStatus}
                {entry.changedByUser?.phone ? ` • ${entry.changedByUser.phone}` : ''}
                {entry.comment ? ` • ${entry.comment}` : ''}
              </p>
            ))}
          </div>
        </Card>
      ) : null}
    </DemoShell>
  );
}
