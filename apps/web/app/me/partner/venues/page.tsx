'use client';

import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../../src/components/ui';
import { apiRequest } from '../../../../src/lib/api';
import {
  formatPartnerVerificationStatus,
  getPartnerVerificationStatusTone,
} from '../../../../src/lib/labels';
import { useDemoSession } from '../../../../src/lib/session';

type City = { id: string; name: string };
type District = { id: string; name: string };

type PartnerProfile = {
  id: string;
  legalName: string;
  verificationStatus: string;
};

type Court = {
  id: string;
  name: string;
  surfaceType: string;
  isIndoor: boolean;
  hasLighting: boolean;
  notes: string | null;
  sortOrder: number;
};

type Venue = {
  id: string;
  name: string;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: {
    cityId: string | null;
    districtId: string | null;
    line1: string;
    line2: string | null;
    postalCode: string | null;
    accessNotes: string | null;
    city: City | null;
    district: District | null;
  };
  courts: Court[];
};

type CourtScheduleTemplate = {
  id: string;
  courtId: string;
  weekday: number;
  timeFrom: string;
  timeTo: string;
  slotDurationMinutes: number;
  isOpen: boolean;
  basePrice: number | string | null;
};

type ScheduleExceptionType = 'closed' | 'custom_hours' | 'blocked' | 'custom_price';

type CourtScheduleException = {
  id: string;
  courtId: string;
  date: string;
  exceptionType: ScheduleExceptionType;
  timeFrom: string | null;
  timeTo: string | null;
  customPrice: number | string | null;
  comment: string | null;
};

type VenueForm = {
  name: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  cityId: string;
  districtId: string;
  line1: string;
  line2: string;
  postalCode: string;
  accessNotes: string;
};

type CourtForm = {
  editingCourtId: string | null;
  name: string;
  surfaceType: string;
  isIndoor: boolean;
  hasLighting: boolean;
  notes: string;
  sortOrder: string;
};

type ScheduleTemplateForm = {
  editingTemplateId: string | null;
  weekday: string;
  timeFrom: string;
  timeTo: string;
  slotDurationMinutes: string;
  isOpen: boolean;
  basePrice: string;
};

type ScheduleExceptionForm = {
  editingExceptionId: string | null;
  date: string;
  exceptionType: ScheduleExceptionType;
  timeFrom: string;
  timeTo: string;
  customPrice: string;
  comment: string;
};

const emptyVenueForm: VenueForm = {
  name: '',
  description: '',
  contactPhone: '',
  contactEmail: '',
  cityId: '',
  districtId: '',
  line1: '',
  line2: '',
  postalCode: '',
  accessNotes: '',
};

const weekdayLabels: Record<number, string> = {
  0: 'Воскресенье',
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

const exceptionLabels: Record<ScheduleExceptionType, string> = {
  closed: 'Закрыт целиком',
  custom_hours: 'Кастомные часы',
  blocked: 'Блокировка интервала',
  custom_price: 'Кастомная цена',
};

const surfaceLabels: Record<string, string> = {
  hard: 'Hard',
  clay: 'Clay',
  grass: 'Grass',
  carpet: 'Carpet',
  acrylic: 'Acrylic',
};

function createEmptyCourtForm(): CourtForm {
  return {
    editingCourtId: null,
    name: '',
    surfaceType: 'hard',
    isIndoor: false,
    hasLighting: false,
    notes: '',
    sortOrder: '0',
  };
}

function createEmptyTemplateForm(): ScheduleTemplateForm {
  return {
    editingTemplateId: null,
    weekday: '1',
    timeFrom: '08:00',
    timeTo: '22:00',
    slotDurationMinutes: '60',
    isOpen: true,
    basePrice: '',
  };
}

function createEmptyExceptionForm(): ScheduleExceptionForm {
  return {
    editingExceptionId: null,
    date: '',
    exceptionType: 'closed',
    timeFrom: '',
    timeTo: '',
    customPrice: '',
    comment: '',
  };
}

function formatSurface(surfaceType: string) {
  return surfaceLabels[surfaceType] ?? surfaceType;
}

function formatMoney(value: number | string | null) {
  if (value === null || value === '') {
    return 'без цены';
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numeric) ? String(value) : `${numeric.toLocaleString('ru-RU')} ₽`;
}

function normalizeExceptionDate(value: string) {
  return value ? value.slice(0, 10) : '';
}

export default function PartnerVenuesPage() {
  const { session, isLoaded } = useDemoSession();
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [templatesByCourt, setTemplatesByCourt] = useState<Record<string, CourtScheduleTemplate[]>>({});
  const [exceptionsByCourt, setExceptionsByCourt] = useState<Record<string, CourtScheduleException[]>>({});
  const [scheduleLoadingByCourt, setScheduleLoadingByCourt] = useState<Record<string, boolean>>({});
  const [venueForm, setVenueForm] = useState<VenueForm>(emptyVenueForm);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [courtForms, setCourtForms] = useState<Record<string, CourtForm>>({});
  const [templateForms, setTemplateForms] = useState<Record<string, ScheduleTemplateForm>>({});
  const [exceptionForms, setExceptionForms] = useState<Record<string, ScheduleExceptionForm>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const loadDistricts = useCallback(async (cityId: string, preserveDistrictId?: string) => {
    if (!cityId) {
      setDistricts([]);
      setVenueForm((current) => ({ ...current, districtId: preserveDistrictId ?? '' }));
      return;
    }

    setDistrictsLoading(true);
    const response = await apiRequest<District[]>(`/reference/cities/${cityId}/districts`);

    if (!response.success || !response.data) {
      setDistricts([]);
      setError(response.error?.message ?? 'Не удалось загрузить районы для площадки.');
      setDistrictsLoading(false);
      return;
    }

    const nextDistricts = response.data;
    setDistricts(nextDistricts);
    setVenueForm((current) => ({
      ...current,
      districtId:
        preserveDistrictId && nextDistricts.some((district) => district.id === preserveDistrictId)
          ? preserveDistrictId
          : '',
    }));
    setDistrictsLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);
    const [partnerResponse, venuesResponse, citiesResponse] = await Promise.all([
      apiRequest<PartnerProfile | null>('/partner/profile/me', { session }),
      apiRequest<Venue[]>('/partner/venues', { session }),
      apiRequest<City[]>('/reference/cities'),
    ]);

    if (partnerResponse.success) {
      setPartnerProfile(partnerResponse.data ?? null);
    } else if (partnerResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(partnerResponse.error?.message ?? 'Не удалось загрузить профиль партнёра.');
    }

    if (venuesResponse.success && venuesResponse.data) {
      setVenues(venuesResponse.data);
    } else if (venuesResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(venuesResponse.error?.message ?? 'Не удалось загрузить список площадок.');
    }

    if (citiesResponse.success && citiesResponse.data) {
      setCities(citiesResponse.data);
    } else {
      setError(citiesResponse.error?.message ?? 'Не удалось загрузить список городов.');
    }
  }, [session]);

  const loadCourtSchedule = useCallback(
    async (courtId: string) => {
      if (!session) {
        return;
      }

      setScheduleLoadingByCourt((current) => ({ ...current, [courtId]: true }));

      const [templatesResponse, exceptionsResponse] = await Promise.all([
        apiRequest<CourtScheduleTemplate[]>(`/partner/courts/${courtId}/schedule-templates`, {
          session,
        }),
        apiRequest<CourtScheduleException[]>(`/partner/courts/${courtId}/schedule-exceptions`, {
          session,
        }),
      ]);

      if (templatesResponse.success && templatesResponse.data) {
        const nextTemplates = templatesResponse.data;
        setTemplatesByCourt((current) => ({ ...current, [courtId]: nextTemplates }));
      } else {
        setError(templatesResponse.error?.message ?? 'Не удалось загрузить шаблоны расписания.');
      }

      if (exceptionsResponse.success && exceptionsResponse.data) {
        const nextExceptions = exceptionsResponse.data;
        setExceptionsByCourt((current) => ({ ...current, [courtId]: nextExceptions }));
      } else {
        setError(exceptionsResponse.error?.message ?? 'Не удалось загрузить исключения расписания.');
      }

      setScheduleLoadingByCourt((current) => ({ ...current, [courtId]: false }));
    },
    [session],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!session || !partnerProfile) {
      return;
    }

    const courtIds = venues.flatMap((venue) => venue.courts.map((court) => court.id));
    if (!courtIds.length) {
      return;
    }

    void Promise.all(courtIds.map((courtId) => loadCourtSchedule(courtId)));
  }, [loadCourtSchedule, partnerProfile, session, venues]);

  const resetVenueEditor = () => {
    setEditingVenueId(null);
    setVenueForm(emptyVenueForm);
    setDistricts([]);
  };

  const startVenueEdit = async (venue: Venue) => {
    setEditingVenueId(venue.id);
    setVenueForm({
      name: venue.name,
      description: venue.description ?? '',
      contactPhone: venue.contactPhone ?? '',
      contactEmail: venue.contactEmail ?? '',
      cityId: venue.address.cityId ?? '',
      districtId: venue.address.districtId ?? '',
      line1: venue.address.line1,
      line2: venue.address.line2 ?? '',
      postalCode: venue.address.postalCode ?? '',
      accessNotes: venue.address.accessNotes ?? '',
    });

    if (venue.address.cityId) {
      await loadDistricts(venue.address.cityId, venue.address.districtId ?? undefined);
    }
  };

  const handleVenueCityChange = async (cityId: string) => {
    setVenueForm((current) => ({ ...current, cityId, districtId: '' }));
    await loadDistricts(cityId);
  };

  const getCourtForm = (venueId: string) => courtForms[venueId] ?? createEmptyCourtForm();
  const updateCourtForm = (venueId: string, nextForm: CourtForm) =>
    setCourtForms((current) => ({ ...current, [venueId]: nextForm }));
  const resetCourtForm = (venueId: string) => updateCourtForm(venueId, createEmptyCourtForm());

  const getTemplateForm = (courtId: string) => templateForms[courtId] ?? createEmptyTemplateForm();
  const updateTemplateForm = (courtId: string, nextForm: ScheduleTemplateForm) =>
    setTemplateForms((current) => ({ ...current, [courtId]: nextForm }));
  const resetTemplateForm = (courtId: string) =>
    updateTemplateForm(courtId, createEmptyTemplateForm());

  const getExceptionForm = (courtId: string) =>
    exceptionForms[courtId] ?? createEmptyExceptionForm();
  const updateExceptionForm = (courtId: string, nextForm: ScheduleExceptionForm) =>
    setExceptionForms((current) => ({ ...current, [courtId]: nextForm }));
  const resetExceptionForm = (courtId: string) =>
    updateExceptionForm(courtId, createEmptyExceptionForm());

  const saveVenue = async () => {
    if (!session || !partnerProfile) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<Venue>(
      editingVenueId ? `/partner/venues/${editingVenueId}` : '/partner/venues',
      {
        method: editingVenueId ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          name: venueForm.name,
          description: venueForm.description || undefined,
          contactPhone: venueForm.contactPhone || undefined,
          contactEmail: venueForm.contactEmail || undefined,
          cityId: venueForm.cityId || undefined,
          districtId: venueForm.districtId || undefined,
          line1: venueForm.line1,
          line2: venueForm.line2 || undefined,
          postalCode: venueForm.postalCode || undefined,
          accessNotes: venueForm.accessNotes || undefined,
        }),
      },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось сохранить площадку.');
      setLoading(false);
      return;
    }

    setMessage(editingVenueId ? 'Площадка обновлена.' : 'Площадка создана.');
    resetVenueEditor();
    setLoading(false);
    await loadData();
  };

  const startCourtEdit = (venueId: string, court: Court) => {
    updateCourtForm(venueId, {
      editingCourtId: court.id,
      name: court.name,
      surfaceType: court.surfaceType,
      isIndoor: court.isIndoor,
      hasLighting: court.hasLighting,
      notes: court.notes ?? '',
      sortOrder: String(court.sortOrder),
    });
  };

  const saveCourt = async (venueId: string) => {
    if (!session) {
      return;
    }

    const courtForm = getCourtForm(venueId);
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<Court>(
      courtForm.editingCourtId
        ? `/partner/venues/${venueId}/courts/${courtForm.editingCourtId}`
        : `/partner/venues/${venueId}/courts`,
      {
        method: courtForm.editingCourtId ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          name: courtForm.name,
          surfaceType: courtForm.surfaceType,
          isIndoor: courtForm.isIndoor,
          hasLighting: courtForm.hasLighting,
          notes: courtForm.notes || undefined,
          sortOrder: Number(courtForm.sortOrder || 0),
        }),
      },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось сохранить корт.');
      setLoading(false);
      return;
    }

    setMessage(courtForm.editingCourtId ? 'Корт обновлён.' : 'Корт добавлен.');
    resetCourtForm(venueId);
    setLoading(false);
    await loadData();
  };

  const saveTemplate = async (courtId: string) => {
    if (!session) {
      return;
    }

    const form = getTemplateForm(courtId);
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<CourtScheduleTemplate>(
      form.editingTemplateId
        ? `/partner/courts/${courtId}/schedule-templates/${form.editingTemplateId}`
        : `/partner/courts/${courtId}/schedule-templates`,
      {
        method: form.editingTemplateId ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          weekday: Number(form.weekday),
          timeFrom: form.timeFrom,
          timeTo: form.timeTo,
          slotDurationMinutes: Number(form.slotDurationMinutes),
          isOpen: form.isOpen,
          basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        }),
      },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось сохранить шаблон расписания.');
      setLoading(false);
      return;
    }

    setMessage(form.editingTemplateId ? 'Шаблон расписания обновлён.' : 'Шаблон расписания добавлен.');
    resetTemplateForm(courtId);
    setLoading(false);
    await loadCourtSchedule(courtId);
  };

  const deleteTemplate = async (courtId: string, templateId: string) => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<{ id: string }>(
      `/partner/courts/${courtId}/schedule-templates/${templateId}`,
      { method: 'DELETE', session },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось удалить шаблон расписания.');
      setLoading(false);
      return;
    }

    setMessage('Шаблон расписания удалён.');
    setLoading(false);
    await loadCourtSchedule(courtId);
  };

  const saveException = async (courtId: string) => {
    if (!session) {
      return;
    }

    const form = getExceptionForm(courtId);
    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<CourtScheduleException>(
      form.editingExceptionId
        ? `/partner/courts/${courtId}/schedule-exceptions/${form.editingExceptionId}`
        : `/partner/courts/${courtId}/schedule-exceptions`,
      {
        method: form.editingExceptionId ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          date: form.date,
          exceptionType: form.exceptionType,
          timeFrom: form.timeFrom || undefined,
          timeTo: form.timeTo || undefined,
          customPrice: form.customPrice ? Number(form.customPrice) : undefined,
          comment: form.comment || undefined,
        }),
      },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось сохранить исключение расписания.');
      setLoading(false);
      return;
    }

    setMessage(form.editingExceptionId ? 'Исключение обновлено.' : 'Исключение добавлено.');
    resetExceptionForm(courtId);
    setLoading(false);
    await loadCourtSchedule(courtId);
  };

  const deleteException = async (courtId: string, exceptionId: string) => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<{ id: string }>(
      `/partner/courts/${courtId}/schedule-exceptions/${exceptionId}`,
      { method: 'DELETE', session },
    );

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось удалить исключение расписания.');
      setLoading(false);
      return;
    }

    setMessage('Исключение удалено.');
    setLoading(false);
    await loadCourtSchedule(courtId);
  };

  return (
    <DemoShell
      title="Площадки, корты и расписание"
      description="Партнёр создаёт площадку, заводит корт и настраивает базовое расписание с исключениями. Эта база дальше используется для проверки доступности и валидации заявок на бронь."
    >
      {!isLoaded ? <Notice>Загружаем кабинет партнёра...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите или зарегистрируйтесь по телефону, а затем откройте управление площадками.
        </Notice>
      ) : null}
      {!partnerProfile && session ? (
        <Notice kind="error">
          Сначала сохраните профиль партнёра на странице <strong>/me/partner</strong>, после этого
          можно добавлять площадки, корты и расписание.
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
            Площадки можно заводить уже сейчас. В публичный каталог и сценарий бронирования попадут
            только активные площадки подтверждённых партнёров, а заявки будут проверяться по
            расписанию корта.
          </p>
        </Card>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>{editingVenueId ? 'Редактирование площадки' : 'Новая площадка'}</h3>
          <div className="form-stack">
            <label className="field">
              <span>Название площадки</span>
              <input
                value={venueForm.name}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, name: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Информация для игроков</span>
              <textarea
                value={venueForm.description}
                placeholder="Опишите вход, покрытие, парковку, раздевалки или другие важные детали."
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, description: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Город</span>
              <select
                value={venueForm.cityId}
                onChange={(event) => void handleVenueCityChange(event.target.value)}
                disabled={!session || !partnerProfile}
              >
                <option value="">Выберите город</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            {!venueForm.cityId || districtsLoading || districts.length ? (
              <label className="field">
                <span>Район / округ</span>
                <select
                  value={venueForm.districtId}
                  onChange={(event) =>
                    setVenueForm((current) => ({ ...current, districtId: event.target.value }))
                  }
                  disabled={!session || !partnerProfile || !venueForm.cityId || districtsLoading}
                >
                  <option value="">
                    {!venueForm.cityId
                      ? 'Сначала выберите город'
                      : districtsLoading
                        ? 'Загрузка...'
                        : 'Выберите район'}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="field">
              <span>Адрес</span>
              <input
                value={venueForm.line1}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, line1: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Дополнительная строка адреса</span>
              <input
                value={venueForm.line2}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, line2: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Почтовый индекс</span>
              <input
                value={venueForm.postalCode}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, postalCode: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Подсказка по доступу</span>
              <textarea
                value={venueForm.accessNotes}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, accessNotes: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Телефон площадки</span>
              <input
                value={venueForm.contactPhone}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, contactPhone: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Email площадки</span>
              <input
                type="email"
                value={venueForm.contactEmail}
                onChange={(event) =>
                  setVenueForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>
          </div>

          <div className="action-row" style={{ marginTop: 20 }}>
            <div>
              <h3>{editingVenueId ? 'Сохранение изменений' : 'Создание площадки'}</h3>
              <p className="muted">
                После сохранения можно сразу завести корт и расписание для сценария бронирования.
              </p>
            </div>
            <div className="button-row">
              {editingVenueId ? (
                <button type="button" className="ghost-button" onClick={resetVenueEditor}>
                  Отменить
                </button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                onClick={saveVenue}
                disabled={!session || !partnerProfile || loading}
              >
                {loading
                  ? 'Сохраняем...'
                  : editingVenueId
                    ? 'Сохранить площадку'
                    : 'Создать площадку'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <h3>Что уже заведено</h3>
          {!venues.length ? (
            <p className="muted">
              Площадок пока нет. Создайте первую площадку и добавьте корты с расписанием.
            </p>
          ) : (
            <div className="list-stack">
              {venues.map((venue) => (
                <button
                  key={venue.id}
                  type="button"
                  className="list-row list-row-detailed"
                  onClick={() => void startVenueEdit(venue)}
                >
                  <div>
                    <strong>{venue.name}</strong>
                    <span>
                      {venue.address.city?.name ?? 'Город не указан'}
                      {venue.address.district?.name ? `, ${venue.address.district.name}` : ''}
                    </span>
                    <span>{venue.address.line1}</span>
                  </div>
                  <StatusBadge tone="neutral">{venue.courts.length} корт(ов)</StatusBadge>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {venues.map((venue) => {
        const courtForm = getCourtForm(venue.id);

        return (
          <Card key={venue.id}>
            <div className="card-header-row">
              <div>
                <h3>{venue.name}</h3>
                <p className="muted">
                  {venue.address.city?.name ?? 'Город не указан'}
                  {venue.address.district?.name ? `, ${venue.address.district.name}` : ''} •{' '}
                  {venue.address.line1}
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void startVenueEdit(venue)}
              >
                Редактировать площадку
              </button>
            </div>

            <div className="split-grid" style={{ marginTop: 16 }}>
              <Card>
                <h3>{courtForm.editingCourtId ? 'Редактирование корта' : 'Новый корт'}</h3>
                <div className="form-stack">
                  <label className="field">
                    <span>Название корта</span>
                    <input
                      value={courtForm.name}
                      onChange={(event) =>
                        updateCourtForm(venue.id, { ...courtForm, name: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Покрытие</span>
                    <input
                      value={courtForm.surfaceType}
                      onChange={(event) =>
                        updateCourtForm(venue.id, {
                          ...courtForm,
                          surfaceType: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Порядок сортировки</span>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={courtForm.sortOrder}
                      onChange={(event) =>
                        updateCourtForm(venue.id, { ...courtForm, sortOrder: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Примечание</span>
                    <textarea
                      value={courtForm.notes}
                      onChange={(event) =>
                        updateCourtForm(venue.id, { ...courtForm, notes: event.target.value })
                      }
                    />
                  </label>

                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={courtForm.isIndoor}
                      onChange={(event) =>
                        updateCourtForm(venue.id, { ...courtForm, isIndoor: event.target.checked })
                      }
                    />
                    <span>Крытый корт</span>
                  </label>

                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={courtForm.hasLighting}
                      onChange={(event) =>
                        updateCourtForm(venue.id, {
                          ...courtForm,
                          hasLighting: event.target.checked,
                        })
                      }
                    />
                    <span>Есть освещение</span>
                  </label>
                </div>

                <div className="action-row" style={{ marginTop: 20 }}>
                  <div>
                    <h3>{courtForm.editingCourtId ? 'Обновление корта' : 'Добавление корта'}</h3>
                    <p className="muted">
                      После создания корта ниже появится блок для шаблонов расписания и исключений.
                    </p>
                  </div>
                  <div className="button-row">
                    {courtForm.editingCourtId ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => resetCourtForm(venue.id)}
                      >
                        Отменить
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void saveCourt(venue.id)}
                      disabled={loading}
                    >
                      {loading
                        ? 'Сохраняем...'
                        : courtForm.editingCourtId
                          ? 'Сохранить корт'
                          : 'Добавить корт'}
                    </button>
                  </div>
                </div>
              </Card>

              <Card>
                <h3>Подсказка по сценарию</h3>
                <div className="info-list compact-list">
                  <p>1. Сначала сохраните профиль партнёра.</p>
                  <p>2. Затем создайте площадку и хотя бы один корт.</p>
                  <p>3. Для рабочего корта задайте шаблон расписания по дням недели.</p>
                  <p>4. Добавьте исключения для закрытий, блокировок или особых часов работы.</p>
                  <p>5. После верификации игрок увидит эту площадку в каталоге и в бронировании.</p>
                </div>
              </Card>
            </div>

            {!venue.courts.length ? (
              <Notice>
                Для этой площадки пока нет кортов. Добавьте хотя бы один корт, чтобы игроки могли отправлять заявки на бронь.
              </Notice>
            ) : null}

            {venue.courts.map((court) => {
              const templateForm = getTemplateForm(court.id);
              const exceptionForm = getExceptionForm(court.id);
              const templates = templatesByCourt[court.id] ?? [];
              const exceptions = exceptionsByCourt[court.id] ?? [];
              const scheduleLoading = scheduleLoadingByCourt[court.id] ?? false;
              const needsTimeRange =
                exceptionForm.exceptionType === 'custom_hours' ||
                exceptionForm.exceptionType === 'blocked' ||
                exceptionForm.exceptionType === 'custom_price';
              const needsCustomPrice = exceptionForm.exceptionType === 'custom_price';

              return (
                <div key={court.id} style={{ marginTop: 20 }}>
                  <Card accent>
                    <div className="card-header-row">
                      <div>
                        <h3>{court.name}</h3>
                        <p className="muted">
                          {formatSurface(court.surfaceType)} • {court.isIndoor ? 'крытый' : 'открытый'}
                          {court.hasLighting ? ' • с освещением' : ''}
                          {court.notes ? ` • ${court.notes}` : ''}
                        </p>
                      </div>
                      <div className="button-row">
                        <StatusBadge tone="neutral">{templates.length} template</StatusBadge>
                        <StatusBadge tone="neutral">{exceptions.length} exception</StatusBadge>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => startCourtEdit(venue.id, court)}
                        >
                          Редактировать корт
                        </button>
                      </div>
                    </div>

                    {scheduleLoading ? <Notice>Загружаем расписание court...</Notice> : null}

                    <div className="split-grid" style={{ marginTop: 16 }}>
                      <Card>
                        <h3>
                          {templateForm.editingTemplateId
                            ? 'Редактирование шаблона'
                            : 'Новый шаблон'}
                        </h3>
                        <div className="form-stack">
                          <label className="field">
                            <span>День недели</span>
                            <select
                              value={templateForm.weekday}
                              onChange={(event) =>
                                updateTemplateForm(court.id, {
                                  ...templateForm,
                                  weekday: event.target.value,
                                })
                              }
                            >
                              {Object.entries(weekdayLabels).map(([weekday, label]) => (
                                <option key={weekday} value={weekday}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="split-grid">
                            <label className="field">
                              <span>С</span>
                              <input
                                type="time"
                                value={templateForm.timeFrom}
                                onChange={(event) =>
                                  updateTemplateForm(court.id, {
                                    ...templateForm,
                                    timeFrom: event.target.value,
                                  })
                                }
                              />
                            </label>

                            <label className="field">
                              <span>До</span>
                              <input
                                type="time"
                                value={templateForm.timeTo}
                                onChange={(event) =>
                                  updateTemplateForm(court.id, {
                                    ...templateForm,
                                    timeTo: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>

                          <label className="field">
                            <span>Длительность слота, минут</span>
                            <input
                              type="number"
                              min="15"
                              max="240"
                              value={templateForm.slotDurationMinutes}
                              onChange={(event) =>
                                updateTemplateForm(court.id, {
                                  ...templateForm,
                                  slotDurationMinutes: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="field">
                            <span>Базовая цена, ₽</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={templateForm.basePrice}
                              onChange={(event) =>
                                updateTemplateForm(court.id, {
                                  ...templateForm,
                                  basePrice: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="checkbox-line">
                            <input
                              type="checkbox"
                              checked={templateForm.isOpen}
                              onChange={(event) =>
                                updateTemplateForm(court.id, {
                                  ...templateForm,
                                  isOpen: event.target.checked,
                                })
                              }
                            />
                            <span>Интервал открыт для бронирования</span>
                          </label>
                        </div>

                        <div className="button-row" style={{ marginTop: 16 }}>
                          {templateForm.editingTemplateId ? (
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => resetTemplateForm(court.id)}
                            >
                              Отменить
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void saveTemplate(court.id)}
                            disabled={loading}
                          >
                            {loading
                              ? 'Сохраняем...'
                              : templateForm.editingTemplateId
                                ? 'Сохранить шаблон'
                                : 'Добавить шаблон'}
                          </button>
                        </div>

                        {!templates.length ? (
                          <p className="muted" style={{ marginTop: 16 }}>
                            Пока нет шаблонов расписания. Без них система не сможет подтвердить
                            доступность корта для заявки на бронь.
                          </p>
                        ) : (
                          <div className="list-stack" style={{ marginTop: 16 }}>
                            {templates.map((template) => (
                              <div key={template.id} className="list-row list-row-detailed">
                                <div>
                                  <strong>{weekdayLabels[template.weekday] ?? template.weekday}</strong>
                                  <span>
                                    {template.timeFrom} - {template.timeTo} • слот{' '}
                                    {template.slotDurationMinutes} мин
                                  </span>
                                  <span>
                                    {template.isOpen ? 'Открыт' : 'Закрыт'} • {formatMoney(template.basePrice)}
                                  </span>
                                </div>
                                <div className="button-row">
                                  <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={() =>
                                      updateTemplateForm(court.id, {
                                        editingTemplateId: template.id,
                                        weekday: String(template.weekday),
                                        timeFrom: template.timeFrom,
                                        timeTo: template.timeTo,
                                        slotDurationMinutes: String(template.slotDurationMinutes),
                                        isOpen: template.isOpen,
                                        basePrice:
                                          template.basePrice === null ? '' : String(template.basePrice),
                                      })
                                    }
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => void deleteTemplate(court.id, template.id)}
                                    disabled={loading}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>

                      <Card>
                        <h3>
                          {exceptionForm.editingExceptionId
                            ? 'Редактирование исключения'
                            : 'Новое исключение'}
                        </h3>
                        <div className="form-stack">
                          <label className="field">
                            <span>Дата</span>
                            <input
                              type="date"
                              value={exceptionForm.date}
                              onChange={(event) =>
                                updateExceptionForm(court.id, {
                                  ...exceptionForm,
                                  date: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="field">
                            <span>Тип исключения</span>
                            <select
                              value={exceptionForm.exceptionType}
                              onChange={(event) =>
                                updateExceptionForm(court.id, {
                                  ...exceptionForm,
                                  exceptionType: event.target.value as ScheduleExceptionType,
                                  timeFrom:
                                    event.target.value === 'closed' ? '' : exceptionForm.timeFrom,
                                  timeTo:
                                    event.target.value === 'closed' ? '' : exceptionForm.timeTo,
                                  customPrice:
                                    event.target.value === 'custom_price'
                                      ? exceptionForm.customPrice
                                      : '',
                                })
                              }
                            >
                              {Object.entries(exceptionLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {needsTimeRange ? (
                            <div className="split-grid">
                              <label className="field">
                                <span>С</span>
                                <input
                                  type="time"
                                  value={exceptionForm.timeFrom}
                                  onChange={(event) =>
                                    updateExceptionForm(court.id, {
                                      ...exceptionForm,
                                      timeFrom: event.target.value,
                                    })
                                  }
                                />
                              </label>

                              <label className="field">
                                <span>До</span>
                                <input
                                  type="time"
                                  value={exceptionForm.timeTo}
                                  onChange={(event) =>
                                    updateExceptionForm(court.id, {
                                      ...exceptionForm,
                                      timeTo: event.target.value,
                                    })
                                  }
                                />
                              </label>
                            </div>
                          ) : null}

                          {needsCustomPrice ? (
                            <label className="field">
                              <span>Кастомная цена, ₽</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={exceptionForm.customPrice}
                                onChange={(event) =>
                                  updateExceptionForm(court.id, {
                                    ...exceptionForm,
                                    customPrice: event.target.value,
                                  })
                                }
                              />
                            </label>
                          ) : null}

                          <label className="field">
                            <span>Комментарий</span>
                            <textarea
                              value={exceptionForm.comment}
                              onChange={(event) =>
                                updateExceptionForm(court.id, {
                                  ...exceptionForm,
                                  comment: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>

                        <div className="button-row" style={{ marginTop: 16 }}>
                          {exceptionForm.editingExceptionId ? (
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => resetExceptionForm(court.id)}
                            >
                              Отменить
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void saveException(court.id)}
                            disabled={loading}
                          >
                            {loading
                              ? 'Сохраняем...'
                              : exceptionForm.editingExceptionId
                                ? 'Сохранить исключение'
                                : 'Добавить исключение'}
                          </button>
                        </div>

                        {!exceptions.length ? (
                          <p className="muted" style={{ marginTop: 16 }}>
                            Исключений пока нет. Добавляйте их точечно для закрытий, блокировок или
                            особых часов работы.
                          </p>
                        ) : (
                          <div className="list-stack" style={{ marginTop: 16 }}>
                            {exceptions.map((exception) => (
                              <div key={exception.id} className="list-row list-row-detailed">
                                <div>
                                  <strong>{normalizeExceptionDate(exception.date)}</strong>
                                  <span>{exceptionLabels[exception.exceptionType]}</span>
                                  <span>
                                    {exception.timeFrom && exception.timeTo
                                      ? `${exception.timeFrom} - ${exception.timeTo}`
                                      : 'Без временного интервала'}
                                    {exception.customPrice !== null
                                      ? ` • ${formatMoney(exception.customPrice)}`
                                      : ''}
                                    {exception.comment ? ` • ${exception.comment}` : ''}
                                  </span>
                                </div>
                                <div className="button-row">
                                  <button
                                    type="button"
                                    className="ghost-button"
                                    onClick={() =>
                                      updateExceptionForm(court.id, {
                                        editingExceptionId: exception.id,
                                        date: normalizeExceptionDate(exception.date),
                                        exceptionType: exception.exceptionType,
                                        timeFrom: exception.timeFrom ?? '',
                                        timeTo: exception.timeTo ?? '',
                                        customPrice:
                                          exception.customPrice === null
                                            ? ''
                                            : String(exception.customPrice),
                                        comment: exception.comment ?? '',
                                      })
                                    }
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => void deleteException(court.id, exception.id)}
                                    disabled={loading}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    </div>
                  </Card>
                </div>
              );
            })}
          </Card>
        );
      })}
    </DemoShell>
  );
}
