'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import {
  formatPartnerType,
  formatPartnerVerificationStatus,
  getPartnerVerificationStatusTone,
} from '../../../src/lib/labels';
import { DemoSession, useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../src/components/ui';

type City = {
  id: string;
  name: string;
};

type District = {
  id: string;
  name: string;
};

type PartnerTypeKey = 'club' | 'school' | 'organizer' | 'store' | 'mixed';

type PartnerProfile = {
  id: string;
  legalName: string;
  brandName: string | null;
  description: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  taxId: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  verificationStatus: string;
  cityId: string | null;
  districtId: string | null;
  profileTypes: Array<{
    partnerType: {
      key: PartnerTypeKey;
      name: string;
    };
  }>;
};

type UserAccount = {
  id: string;
  phone: string;
  email: string | null;
  status: string;
  roles: NonNullable<DemoSession['user']>['roles'];
};

const partnerTypeOptions: PartnerTypeKey[] = ['club', 'school', 'organizer', 'store', 'mixed'];

const emptyForm = {
  legalName: '',
  brandName: '',
  description: '',
  contactPhone: '',
  contactEmail: '',
  taxId: '',
  legalAddress: '',
  actualAddress: '',
  cityId: '',
  districtId: '',
  partnerTypes: ['club'] as PartnerTypeKey[],
};

export default function PartnerProfilePage() {
  const { session, isLoaded } = useDemoSession();
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const loadDistricts = useCallback(async (cityId: string, preserveDistrictId?: string) => {
    if (!cityId) {
      setDistricts([]);
      setForm((current) => ({
        ...current,
        districtId: preserveDistrictId ?? '',
      }));
      return;
    }

    setDistrictsLoading(true);

    const districtsResponse = await apiRequest<District[]>(`/reference/cities/${cityId}/districts`);

    if (!districtsResponse.success || !districtsResponse.data) {
      setDistricts([]);
      setError(districtsResponse.error?.message ?? 'Не удалось загрузить список районов.');
      setDistrictsLoading(false);
      return;
    }

    const nextDistricts = districtsResponse.data;
    setDistricts(nextDistricts);
    setForm((current) => ({
      ...current,
      districtId:
        preserveDistrictId &&
        nextDistricts.some((district) => district.id === preserveDistrictId)
          ? preserveDistrictId
          : '',
    }));
    setDistrictsLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!session) {
        return;
      }

      setError(null);

      const [citiesResponse, accountResponse, profileResponse] = await Promise.all([
        apiRequest<City[]>('/reference/cities'),
        apiRequest<UserAccount>('/user/account', {
          session,
        }),
        apiRequest<PartnerProfile | null>('/partner/profile/me', {
          session,
        }),
      ]);

      if (citiesResponse.success && citiesResponse.data) {
        setCities(citiesResponse.data);
      } else {
        setError(citiesResponse.error?.message ?? 'Не удалось загрузить список городов.');
      }

      if (accountResponse.success && accountResponse.data) {
        const nextAccount = accountResponse.data;
        setAccount(nextAccount);
      } else {
        setError(accountResponse.error?.message ?? 'Не удалось загрузить данные аккаунта.');
      }

      if (profileResponse.success && profileResponse.data) {
        const currentProfile = profileResponse.data;
        setProfile(currentProfile);
        setForm({
          legalName: currentProfile.legalName,
          brandName: currentProfile.brandName ?? '',
          description: currentProfile.description ?? '',
          contactPhone: currentProfile.contactPhone ?? accountResponse.data?.phone ?? '',
          contactEmail: currentProfile.contactEmail ?? accountResponse.data?.email ?? '',
          taxId: currentProfile.taxId ?? '',
          legalAddress: currentProfile.legalAddress ?? '',
          actualAddress: currentProfile.actualAddress ?? '',
          cityId: currentProfile.cityId ?? '',
          districtId: currentProfile.districtId ?? '',
          partnerTypes: currentProfile.profileTypes.map(({ partnerType }) => partnerType.key),
        });

        if (currentProfile.cityId) {
          await loadDistricts(currentProfile.cityId, currentProfile.districtId ?? undefined);
        }
      } else {
        setForm((current) => ({
          ...current,
          contactPhone: current.contactPhone || accountResponse.data?.phone || '',
          contactEmail: current.contactEmail || accountResponse.data?.email || '',
        }));
      }
    };

    void load();
  }, [session, loadDistricts]);

  const handleCityChange = async (cityId: string) => {
    setForm((current) => ({
      ...current,
      cityId,
      districtId: '',
    }));

    setError(null);
    await loadDistricts(cityId);
  };

  const togglePartnerType = (key: PartnerTypeKey) => {
    setForm((current) => ({
      ...current,
      partnerTypes: current.partnerTypes.includes(key)
        ? current.partnerTypes.filter((item) => item !== key)
        : [...current.partnerTypes, key],
    }));
  };

  const submit = async () => {
    if (!session) {
      return;
    }

    if (!form.partnerTypes.length) {
      setError('Выберите хотя бы один тип партнёра.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<PartnerProfile>(
      profile ? '/partner/profile/me' : '/partner/profile',
      {
        method: profile ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          legalName: form.legalName,
          brandName: form.brandName || undefined,
          description: form.description || undefined,
          contactPhone: form.contactPhone || undefined,
          contactEmail: form.contactEmail || undefined,
          taxId: form.taxId || undefined,
          legalAddress: form.legalAddress || undefined,
          actualAddress: form.actualAddress || undefined,
          cityId: form.cityId || undefined,
          districtId: form.districtId || undefined,
          partnerTypes: form.partnerTypes,
        }),
      },
    );

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось сохранить профиль партнёра.');
      setLoading(false);
      return;
    }

    setProfile(response.data);
    setMessage('Профиль сохранён.');
    setLoading(false);
  };

  return (
    <DemoShell
      title="Профиль партнёра"
      description="Заполните анкету клуба или организации, чтобы сохранить рабочий профиль и перейти к верификации."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите через страницу демо-входа, а затем заполните анкету партнёра.
        </Notice>
      ) : null}
      {!profile && session ? (
        <Notice title="Профиль еще не создан">
          Заполните основные сведения, контакты и реквизиты. После сохранения можно перейти к
          верификации.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {profile ? (
        <Card accent>
          <div className="card-header-row">
            <h3>Текущее состояние</h3>
            <StatusBadge tone={getPartnerVerificationStatusTone(profile.verificationStatus)}>
              {formatPartnerVerificationStatus(profile.verificationStatus)}
            </StatusBadge>
          </div>
          <p className="muted">
            Профиль уже сохранен. После обновления данных можно перейти на страницу верификации и
            отправить заявку на проверку.
          </p>
        </Card>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Основные сведения</h3>
          <div className="form-stack">
            <label className="field">
              <span>Юридическое название</span>
              <input
                value={form.legalName}
                placeholder="Например: ООО «Теннис Спот»"
                onChange={(event) =>
                  setForm((current) => ({ ...current, legalName: event.target.value }))
                }
                disabled={!session}
              />
            </label>

            <label className="field">
              <span>Название бренда</span>
              <input
                value={form.brandName}
                placeholder="Например: Tennis Spot Club"
                onChange={(event) =>
                  setForm((current) => ({ ...current, brandName: event.target.value }))
                }
                disabled={!session}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3>Локация</h3>
          <div className="form-stack">
            <label className="field">
              <span>Город</span>
              <select
                value={form.cityId}
                onChange={(event) => void handleCityChange(event.target.value)}
                disabled={!session}
              >
                <option value="">Выберите город</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            {!form.cityId || districtsLoading || districts.length ? (
              <label className="field">
                <span>Район / округ</span>
                <select
                  value={form.districtId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, districtId: event.target.value }))
                  }
                  disabled={!session || !form.cityId || districtsLoading}
                >
                  <option value="">
                    {!form.cityId
                      ? 'Сначала выберите город'
                      : districtsLoading
                        ? 'Загрузка...'
                        : 'Выберите район или округ'}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="split-grid">
        <Card>
          <h3>Контакты</h3>
          <div className="form-stack">
            <label className="field">
              <span>Контактный телефон</span>
              <input
                value={form.contactPhone}
                placeholder={account?.phone ?? '+7 (___) ___-__-__'}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactPhone: event.target.value }))
                }
                disabled={!session}
              />
            </label>

            <label className="field">
              <span>Email для связи</span>
              <input
                type="email"
                value={form.contactEmail}
                placeholder={account?.email ?? 'club@example.com'}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                disabled={!session}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3>Реквизиты</h3>
          <div className="form-stack">
            <label className="field">
              <span>ИНН</span>
              <input
                value={form.taxId}
                placeholder="Например: 7701234567"
                onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))}
                disabled={!session}
              />
            </label>

            <label className="field">
              <span>Юридический адрес</span>
              <textarea
                value={form.legalAddress}
                placeholder="Например: Москва, Пресненская набережная, 12"
                onChange={(event) =>
                  setForm((current) => ({ ...current, legalAddress: event.target.value }))
                }
                disabled={!session}
              />
            </label>

            <label className="field">
              <span>Фактический адрес</span>
              <textarea
                value={form.actualAddress}
                placeholder="Например: Санкт-Петербург, Аптекарская набережная, 6"
                onChange={(event) =>
                  setForm((current) => ({ ...current, actualAddress: event.target.value }))
                }
                disabled={!session}
              />
            </label>
          </div>
        </Card>
      </div>

      <div className="split-grid">
        <Card>
          <h3>О клубе или организации</h3>
          <label className="field">
            <span>Информация для игроков</span>
            <textarea
              value={form.description}
              placeholder="Опишите формат площадки, корты, тренировки и важные условия для игроков..."
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              disabled={!session}
            />
          </label>
        </Card>

        <Card>
          <h3>Специализация</h3>
          <p className="muted">
            Можно выбрать несколько вариантов, если они действительно подходят вашему формату.
          </p>
          <div className="choice-grid">
            {partnerTypeOptions.map((partnerType) => (
              <label key={partnerType} className="choice-chip">
                <input
                  type="checkbox"
                  checked={form.partnerTypes.includes(partnerType)}
                  onChange={() => togglePartnerType(partnerType)}
                  disabled={!session}
                />
                <span>{formatPartnerType(partnerType)}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="action-row">
          <div>
            <h3>{profile ? 'Сохранение изменений' : 'Создание профиля'}</h3>
            <p className="muted">
              После сохранения можно перейти к следующему шагу и отправить данные на верификацию.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={!session || loading}
          >
            {loading ? 'Сохраняем...' : profile ? 'Сохранить изменения' : 'Создать профиль'}
          </button>
        </div>
      </Card>
    </DemoShell>
  );
}
