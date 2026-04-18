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

type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  cityId: string | null;
  districtId: string | null;
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

type BookingOption = {
  venue: {
    id: string;
    name: string;
    activeCourtsCount: number;
    address: {
      line1: string;
      city: City | null;
      district: District | null;
    };
  };
  partnerProfile: {
    id: string;
    legalName: string;
    brandName: string | null;
  };
  court: {
    id: string;
    name: string;
    surfaceType: string;
    isIndoor: boolean;
    hasLighting: boolean;
  };
  availableInterval: {
    bookingDate: string;
    timeFrom: string;
    timeTo: string;
    slotDurationMinutes: number;
    price: number | string | null;
  };
};

type SearchForm = {
  cityId: string;
  districtId: string;
  bookingDate: string;
  timeFrom: string;
  timeTo: string;
  surfaceType: string;
  courtType: 'any' | 'indoor' | 'outdoor';
};

type RequestForm = {
  playersCount: string;
  commentFromPlayer: string;
};

const initialSearchForm: SearchForm = {
  cityId: '',
  districtId: '',
  bookingDate: '',
  timeFrom: '18:00',
  timeTo: '19:30',
  surfaceType: '',
  courtType: 'any',
};

const initialRequestForm: RequestForm = {
  playersCount: '2',
  commentFromPlayer: '',
};

const surfaceOptions = [
  { value: '', label: 'Любое покрытие' },
  { value: 'hard', label: 'Хард' },
  { value: 'clay', label: 'Грунт' },
  { value: 'grass', label: 'Трава' },
  { value: 'carpet', label: 'Ковер' },
  { value: 'acrylic', label: 'Акрил' },
] as const;

function getVenueLabel(venue: BookingOption['venue'] | BookingRequestListItem['venue']) {
  const parts = [venue.address.city?.name, venue.address.district?.name, venue.address.line1].filter(
    Boolean,
  );

  return parts.join(', ');
}

function getCourtTypeLabel(isIndoor: boolean) {
  return isIndoor ? 'Крытый' : 'Открытый';
}

function formatSurface(surfaceType: string) {
  return surfaceOptions.find((option) => option.value === surfaceType)?.label ?? surfaceType;
}

function formatPrice(price: number | string | null) {
  if (price === null || price === '') {
    return 'Цена не указана';
  }

  const numeric = typeof price === 'number' ? price : Number(price);
  return Number.isNaN(numeric) ? String(price) : `${numeric.toLocaleString('ru-RU')} ₽`;
}

function canCancelBooking(status: string) {
  return status === 'pending' || status === 'confirmed';
}

export default function BookingRequestsPage() {
  const { session, isLoaded } = useDemoSession();
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequestListItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequestDetails | null>(null);
  const [searchForm, setSearchForm] = useState<SearchForm>(initialSearchForm);
  const [requestForm, setRequestForm] = useState<RequestForm>(initialRequestForm);
  const [options, setOptions] = useState<BookingOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<BookingOption | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const loadDistricts = useCallback(async (cityId: string, preserveDistrictId?: string) => {
    if (!cityId) {
      setDistricts([]);
      setSearchForm((current) => ({
        ...current,
        districtId: preserveDistrictId ?? '',
      }));
      return;
    }

    setDistrictsLoading(true);
    const response = await apiRequest<District[]>(`/reference/cities/${cityId}/districts`);

    if (!response.success || !response.data) {
      setDistricts([]);
      setError(response.error?.message ?? 'Не удалось загрузить список районов.');
      setDistrictsLoading(false);
      return;
    }

    const nextDistricts = response.data;
    setDistricts(nextDistricts);
    setSearchForm((current) => ({
      ...current,
      districtId:
        preserveDistrictId && nextDistricts.some((district) => district.id === preserveDistrictId)
          ? preserveDistrictId
          : '',
    }));
    setDistrictsLoading(false);
  }, []);

  const loadBaseData = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);

    const [playerResponse, citiesResponse, bookingRequestsResponse] = await Promise.all([
      apiRequest<PlayerProfile | null>('/player/profile/me', { session }),
      apiRequest<City[]>('/reference/cities'),
      apiRequest<BookingRequestListItem[]>('/booking-requests/me', { session }),
    ]);

    if (playerResponse.success) {
      const nextProfile = playerResponse.data ?? null;
      setPlayerProfile(nextProfile);

      if (nextProfile?.cityId) {
        setSearchForm((current) =>
          current.cityId
            ? current
            : {
                ...current,
                cityId: nextProfile.cityId ?? '',
                districtId: nextProfile.districtId ?? '',
              },
        );
        await loadDistricts(nextProfile.cityId, nextProfile.districtId ?? undefined);
      }
    } else if (playerResponse.error?.code !== 'PLAYER_PROFILE_NOT_FOUND') {
      setError(playerResponse.error?.message ?? 'Не удалось загрузить профиль игрока.');
    }

    if (citiesResponse.success && citiesResponse.data) {
      setCities(citiesResponse.data);
    } else {
      setError(citiesResponse.error?.message ?? 'Не удалось загрузить список городов.');
    }

    if (bookingRequestsResponse.success && bookingRequestsResponse.data) {
      setBookingRequests(bookingRequestsResponse.data);
    } else if (bookingRequestsResponse.error?.code !== 'PLAYER_PROFILE_NOT_FOUND') {
      setError(bookingRequestsResponse.error?.message ?? 'Не удалось загрузить заявки игрока.');
    }
  }, [loadDistricts, session]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const updateSearchForm = <Key extends keyof SearchForm,>(key: Key, value: SearchForm[Key]) => {
    setSelectedOption(null);
    setOptions([]);
    setHasSearched(false);
    setSearchForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

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

  const runSearch = async () => {
    if (!searchForm.bookingDate || !searchForm.timeFrom || !searchForm.timeTo) {
      setError('Укажите дату и временной интервал, чтобы подобрать доступные корты.');
      setHasSearched(false);
      return;
    }

    if (searchForm.timeTo <= searchForm.timeFrom) {
      setError('Время окончания должно быть позже времени начала.');
      setHasSearched(false);
      return;
    }

    setSearchLoading(true);
    setMessage(null);
    setError(null);
    setHasSearched(true);

    const params = new URLSearchParams();

    if (searchForm.cityId) {
      params.set('cityId', searchForm.cityId);
    }

    if (searchForm.districtId) {
      params.set('districtId', searchForm.districtId);
    }

    params.set('bookingDate', searchForm.bookingDate);
    params.set('timeFrom', searchForm.timeFrom);
    params.set('timeTo', searchForm.timeTo);

    if (searchForm.surfaceType) {
      params.set('surfaceType', searchForm.surfaceType);
    }

    if (searchForm.courtType !== 'any') {
      params.set('courtType', searchForm.courtType);
    }

    const response = await apiRequest<BookingOption[]>(`/booking-requests/options?${params.toString()}`);

    if (!response.success || !response.data) {
      setOptions([]);
      setSelectedOption(null);
      setError(response.error?.message ?? 'Не удалось подобрать подходящие варианты.');
      setSearchLoading(false);
      return;
    }

    const nextOptions = response.data;
    setOptions(nextOptions);
    setSelectedOption((current) => {
      if (!current) {
        return null;
      }

      return (
        nextOptions.find(
          (option) =>
            option.venue.id === current.venue.id && option.court.id === current.court.id,
        ) ?? null
      );
    });
    setSearchLoading(false);
  };

  const saveBookingRequest = async () => {
    if (!session || !selectedOption) {
      return;
    }

    const playersCount = Number(requestForm.playersCount || 0);

    if (!Number.isInteger(playersCount) || playersCount < 1 || playersCount > 8) {
      setError('Укажите корректное количество игроков от 1 до 8.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<BookingRequestDetails>('/booking-requests', {
      method: 'POST',
      session,
      body: JSON.stringify({
        venueId: selectedOption.venue.id,
        courtId: selectedOption.court.id,
        bookingDate: searchForm.bookingDate,
        timeFrom: selectedOption.availableInterval.timeFrom,
        timeTo: selectedOption.availableInterval.timeTo,
        playersCount,
        commentFromPlayer: requestForm.commentFromPlayer || undefined,
      }),
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось отправить заявку на бронь.');
      setLoading(false);
      return;
    }

    setSelectedBooking(response.data);
    setSelectedOption(null);
    setRequestForm(initialRequestForm);
    setMessage('Заявка на бронь отправлена партнёру.');
    setLoading(false);
    await Promise.all([loadBaseData(), runSearch()]);
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

    setSelectedBooking(response.data);
    setMessage('Заявка отменена.');
    setLoading(false);
    await Promise.all([loadBaseData(), hasSearched ? runSearch() : Promise.resolve()]);
  };

  const searchReady = Boolean(searchForm.bookingDate && searchForm.timeFrom && searchForm.timeTo);

  return (
    <DemoShell
      title="Заявки игрока на бронь"
      description="Сначала задайте требования к корту, затем выберите подходящий вариант и только после этого отправьте короткую заявку партнёру."
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
          отправлять заявки на бронь.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <h3>Подобрать корт</h3>
          <div className="form-stack">
            <label className="field">
              <span>Город</span>
              <select
                value={searchForm.cityId}
                onChange={(event) => {
                  const cityId = event.target.value;
                  updateSearchForm('cityId', cityId);
                  setSearchForm((current) => ({
                    ...current,
                    cityId,
                    districtId: '',
                  }));
                  void loadDistricts(cityId);
                }}
                disabled={searchLoading || loading}
              >
                <option value="">Любой город</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Район / округ</span>
              <select
                value={searchForm.districtId}
                onChange={(event) => updateSearchForm('districtId', event.target.value)}
                disabled={!searchForm.cityId || districtsLoading || searchLoading || loading}
              >
                <option value="">
                  {!searchForm.cityId
                    ? 'Сначала выберите город'
                    : districtsLoading
                      ? 'Загружаем районы...'
                      : 'Любой район'}
                </option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Дата</span>
              <input
                type="date"
                value={searchForm.bookingDate}
                onChange={(event) => updateSearchForm('bookingDate', event.target.value)}
                disabled={searchLoading || loading}
              />
            </label>

            <div className="split-grid">
              <label className="field">
                <span>С</span>
                <input
                  type="time"
                  value={searchForm.timeFrom}
                  onChange={(event) => updateSearchForm('timeFrom', event.target.value)}
                  disabled={searchLoading || loading}
                />
              </label>

              <label className="field">
                <span>До</span>
                <input
                  type="time"
                  value={searchForm.timeTo}
                  onChange={(event) => updateSearchForm('timeTo', event.target.value)}
                  disabled={searchLoading || loading}
                />
              </label>
            </div>

            <label className="field">
              <span>Покрытие</span>
              <select
                value={searchForm.surfaceType}
                onChange={(event) => updateSearchForm('surfaceType', event.target.value)}
                disabled={searchLoading || loading}
              >
                {surfaceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Тип корта</span>
              <select
                value={searchForm.courtType}
                onChange={(event) =>
                  updateSearchForm('courtType', event.target.value as SearchForm['courtType'])
                }
                disabled={searchLoading || loading}
              >
                <option value="any">Любой</option>
                <option value="indoor">Крытый</option>
                <option value="outdoor">Открытый</option>
              </select>
            </label>
          </div>

          <div className="action-row" style={{ marginTop: 20 }}>
            <div>
              <h3>Что делает система</h3>
              <p className="muted">
                В подбор попадают только те корты, которые доступны по расписанию, не заблокированы
                исключениями и не конфликтуют с уже активными заявками.
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => void runSearch()}
              disabled={searchLoading || loading || !searchReady}
            >
              {searchLoading ? 'Подбираем...' : 'Подобрать варианты'}
            </button>
          </div>
        </Card>

        <Card>
          <h3>Отправить заявку</h3>
          {!selectedOption ? (
            <Notice>
              Сначала подберите варианты и выберите подходящий корт. После выбора здесь останется
              только короткая форма заявки.
            </Notice>
          ) : (
            <>
              <div className="info-list">
                <p>
                  <strong>Площадка:</strong> {selectedOption.venue.name}
                </p>
                <p>
                  <strong>Корт:</strong> {selectedOption.court.name}
                </p>
                <p>
                  <strong>Адрес:</strong> {getVenueLabel(selectedOption.venue)}
                </p>
                <p>
                  <strong>Формат:</strong> {formatSurface(selectedOption.court.surfaceType)} •{' '}
                  {getCourtTypeLabel(selectedOption.court.isIndoor)}
                </p>
                <p>
                  <strong>Интервал:</strong> {formatDate(selectedOption.availableInterval.bookingDate)} •{' '}
                  {selectedOption.availableInterval.timeFrom} - {selectedOption.availableInterval.timeTo}
                </p>
                <p>
                  <strong>Цена:</strong> {formatPrice(selectedOption.availableInterval.price)}
                </p>
              </div>

              <div className="form-stack" style={{ marginTop: 16 }}>
                <label className="field">
                  <span>Количество игроков</span>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={requestForm.playersCount}
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        playersCount: event.target.value,
                      }))
                    }
                    disabled={!session || !playerProfile || loading}
                  />
                </label>

                <label className="field">
                  <span>Комментарий игрока</span>
                  <textarea
                    value={requestForm.commentFromPlayer}
                    onChange={(event) =>
                      setRequestForm((current) => ({
                        ...current,
                        commentFromPlayer: event.target.value,
                      }))
                    }
                    disabled={!session || !playerProfile || loading}
                  />
                </label>
              </div>

              <div className="button-row" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setSelectedOption(null)}
                  disabled={loading}
                >
                  Снять выбор
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void saveBookingRequest()}
                  disabled={!session || !playerProfile || loading}
                >
                  {loading ? 'Отправляем...' : 'Отправить заявку'}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <div className="card-header-row">
          <h3>Подходящие варианты</h3>
          <StatusBadge tone="neutral">{options.length}</StatusBadge>
        </div>

        {!hasSearched ? (
          <p className="muted">
            Задайте требования выше и нажмите «Подобрать варианты», чтобы увидеть доступные корты.
          </p>
        ) : null}

        {hasSearched && !searchLoading && !options.length ? (
          <Notice>
            По выбранным условиям пока нет подходящих кортов. Измените дату, время или параметры
            покрытия.
          </Notice>
        ) : null}

        {options.length ? (
          <div className="list-stack">
            {options.map((option) => {
              const isSelected =
                selectedOption?.venue.id === option.venue.id &&
                selectedOption?.court.id === option.court.id;

              return (
                <div key={`${option.venue.id}-${option.court.id}`} className="list-row list-row-detailed">
                  <div>
                    <strong>
                      {option.venue.name} / {option.court.name}
                    </strong>
                    <span>
                      {getVenueLabel(option.venue)} • {formatSurface(option.court.surfaceType)} •{' '}
                      {getCourtTypeLabel(option.court.isIndoor)}
                    </span>
                    <span>
                      Доступно: {option.availableInterval.timeFrom} - {option.availableInterval.timeTo} •{' '}
                      {formatPrice(option.availableInterval.price)}
                    </span>
                    <span>
                      Партнёр: {option.partnerProfile.brandName || option.partnerProfile.legalName} •
                      Активных кортов на площадке: {option.venue.activeCourtsCount}
                    </span>
                  </div>
                  <div className="button-row">
                    {option.court.hasLighting ? (
                      <StatusBadge tone="success">С освещением</StatusBadge>
                    ) : null}
                    <button
                      type="button"
                      className={isSelected ? 'primary-button' : 'secondary-button'}
                      onClick={() => setSelectedOption(option)}
                    >
                      {isSelected ? 'Выбрано' : 'Выбрать'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="card-header-row">
          <h3>Мои заявки</h3>
          <StatusBadge tone="neutral">{bookingRequests.length}</StatusBadge>
        </div>
        {!bookingRequests.length ? (
          <p className="muted">Пока нет заявок. Сначала подберите вариант и отправьте первую заявку.</p>
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
                  <span>{getVenueLabel(bookingRequest.venue) || 'Адрес не указан'}</span>
                  <span>
                    Игроков: {bookingRequest.playersCount} • Покрытие:{' '}
                    {formatSurface(bookingRequest.court.surfaceType)}
                  </span>
                  <span>
                    Комментарий партнёра:{' '}
                    {bookingRequest.commentFromPartner ? bookingRequest.commentFromPartner : 'пока нет'}
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
                  {canCancelBooking(bookingRequest.status) ? (
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
              <strong>Создана:</strong> {formatDateTime(selectedBooking.createdAt)}
            </p>
            <p>
              <strong>Отправлена:</strong> {formatDateTime(selectedBooking.submittedAt)}
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
                {formatDateTime(entry.createdAt)} • {formatBookingRequestStatus(entry.oldStatus ?? 'draft')} →{' '}
                {formatBookingRequestStatus(entry.newStatus)}
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
