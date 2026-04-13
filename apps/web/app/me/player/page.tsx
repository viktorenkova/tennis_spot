'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { formatPlayerStatus, getPlayerStatusTone } from '../../../src/lib/labels';
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

type PlayerProfile = {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  ntrpSelfRating: string | number | null;
  cityId: string | null;
  districtId: string | null;
};

type UserAccount = {
  id: string;
  phone: string;
  email: string | null;
  status: string;
  roles: NonNullable<DemoSession['user']>['roles'];
};

const ntrpOptions = [
  { value: '1', label: '1.0 — начинающий' },
  { value: '1.5', label: '1.5 — только начинает играть' },
  { value: '2', label: '2.0 — базовые навыки' },
  { value: '2.5', label: '2.5 — играет нерегулярно' },
  { value: '3', label: '3.0 — уверенный любитель' },
  { value: '3.5', label: '3.5 — стабильный средний уровень' },
  { value: '4', label: '4.0 — сильный любитель' },
  { value: '4.5', label: '4.5 — продвинутый игрок' },
  { value: '5', label: '5.0+ — очень высокий уровень' },
] as const;

const emptyForm = {
  firstName: '',
  lastName: '',
  bio: '',
  ntrpSelfRating: '',
  cityId: '',
  districtId: '',
  email: '',
};

export default function PlayerProfilePage() {
  const { session, isLoaded, setSession } = useDemoSession();
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [showNtrpHelp, setShowNtrpHelp] = useState(false);

  const syncSessionUser = useCallback(
    (nextAccount: UserAccount) => {
      if (!session?.user) {
        return;
      }

      const hasChanged =
        session.user.phone !== nextAccount.phone ||
        session.user.email !== nextAccount.email ||
        session.user.status !== nextAccount.status ||
        JSON.stringify(session.user.roles) !== JSON.stringify(nextAccount.roles);

      if (!hasChanged) {
        return;
      }

      setSession({
        ...session,
        user: {
          ...session.user,
          phone: nextAccount.phone,
          email: nextAccount.email,
          status: nextAccount.status,
          roles: nextAccount.roles,
        },
      });
    },
    [session, setSession],
  );

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
      setError(districtsResponse.error?.message ?? 'Не удалось загрузить список районов и округов.');
      setDistrictsLoading(false);
      return;
    }

    const nextDistricts = districtsResponse.data;
    setDistricts(nextDistricts);
    setForm((current) => ({
      ...current,
      districtId:
        preserveDistrictId && nextDistricts.some((district) => district.id === preserveDistrictId)
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
        apiRequest<PlayerProfile | null>('/player/profile/me', {
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
        setForm((current) => ({
          ...current,
          email: nextAccount.email ?? '',
        }));
      } else {
        setError(accountResponse.error?.message ?? 'Не удалось загрузить данные аккаунта.');
      }

      if (profileResponse.success && profileResponse.data) {
        const nextProfile = profileResponse.data;
        setProfile(nextProfile);
        setForm((current) => ({
          ...current,
          firstName: nextProfile.firstName ?? '',
          lastName: nextProfile.lastName ?? '',
          bio: nextProfile.bio ?? '',
          ntrpSelfRating: nextProfile.ntrpSelfRating ? String(nextProfile.ntrpSelfRating) : '',
          cityId: nextProfile.cityId ?? '',
          districtId: nextProfile.districtId ?? '',
        }));

        if (nextProfile.cityId) {
          await loadDistricts(nextProfile.cityId, nextProfile.districtId ?? undefined);
        }
      } else if (
        profileResponse.error?.code &&
        profileResponse.error.code !== 'PLAYER_PROFILE_NOT_FOUND'
      ) {
        setError(profileResponse.error.message ?? 'Не удалось загрузить профиль игрока.');
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

  const submit = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const accountResponse = await apiRequest<UserAccount>('/user/account', {
      method: 'PATCH',
      session,
      body: JSON.stringify({
        email: form.email || undefined,
      }),
    });

    if (!accountResponse.success || !accountResponse.data) {
      setError(accountResponse.error?.message ?? 'Не удалось сохранить контактные данные аккаунта.');
      setLoading(false);
      return;
    }

    const nextAccount = accountResponse.data;
    setAccount(nextAccount);

    const profileResponse = await apiRequest<PlayerProfile>(
      profile ? '/player/profile/me' : '/player/profile',
      {
        method: profile ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          bio: form.bio || undefined,
          ntrpSelfRating: form.ntrpSelfRating ? Number(form.ntrpSelfRating) : undefined,
          cityId: form.cityId || undefined,
          districtId: form.districtId || undefined,
        }),
      },
    );

    if (!profileResponse.success || !profileResponse.data) {
      setError(profileResponse.error?.message ?? 'Не удалось сохранить анкету игрока.');
      setLoading(false);
      return;
    }

    const savedProfile = profileResponse.data;
    setProfile(savedProfile);
    setForm({
      firstName: savedProfile.firstName ?? '',
      lastName: savedProfile.lastName ?? '',
      bio: savedProfile.bio ?? '',
      ntrpSelfRating: savedProfile.ntrpSelfRating ? String(savedProfile.ntrpSelfRating) : '',
      cityId: savedProfile.cityId ?? '',
      districtId: savedProfile.districtId ?? '',
      email: nextAccount.email ?? '',
    });
    syncSessionUser(nextAccount);
    setMessage(profile ? 'Изменения сохранены.' : 'Профиль игрока создан.');
    setLoading(false);
  };

  return (
    <DemoShell
      title="Профиль игрока"
      description="Заполните анкету игрока, добавьте контакты аккаунта и сохраните основную информацию для дальнейшего сценария."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите через страницу демо-входа, а затем заполните анкету игрока.
        </Notice>
      ) : null}
      {!profile && session ? (
        <Notice title="Профиль еще не создан">
          Заполните анкету ниже и сохраните ее. После этого профиль игрока станет доступен в
          системе.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {profile ? (
        <Card accent>
          <div className="card-header-row">
            <h3>Текущее состояние</h3>
            <StatusBadge tone={getPlayerStatusTone(profile.status)}>
              {formatPlayerStatus(profile.status)}
            </StatusBadge>
          </div>
          <p className="muted">
            Профиль уже сохранен. При необходимости обновите поля и сохраните изменения.
          </p>
        </Card>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Основная информация</h3>
          <div className="form-stack">
            <label className="field">
              <span>Имя</span>
              <input
                value={form.firstName}
                placeholder="Например: Анна"
                onChange={(event) =>
                  setForm((current) => ({ ...current, firstName: event.target.value }))
                }
                disabled={!session}
              />
            </label>

            <label className="field">
              <span>Фамилия</span>
              <input
                value={form.lastName}
                placeholder="Например: Иванова"
                onChange={(event) =>
                  setForm((current) => ({ ...current, lastName: event.target.value }))
                }
                disabled={!session}
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3>Контакты аккаунта</h3>
          <div className="form-stack">
            <label className="field">
              <span>Телефон</span>
              <input value={account?.phone ?? session?.user?.phone ?? ''} readOnly disabled />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                placeholder="Например: player@example.com"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={!session}
              />
            </label>
          </div>
          <p className="helper-copy">
            Телефон берется из аккаунта. Email можно обновить здесь, чтобы использовать его в
            дальнейшем сценарии.
          </p>
        </Card>
      </div>

      <div className="split-grid">
        <Card>
          <h3>Теннисный уровень</h3>
          <div className="field">
            <div className="field-label-row">
              <span>Самооценка NTRP</span>
              <button
                type="button"
                className="help-trigger"
                aria-label="Показать пояснение по NTRP"
                onClick={() => setShowNtrpHelp((current) => !current)}
              >
                ?
              </button>
            </div>
            <select
              value={form.ntrpSelfRating}
              onChange={(event) =>
                setForm((current) => ({ ...current, ntrpSelfRating: event.target.value }))
              }
              disabled={!session}
            >
              <option value="">Выберите свой уровень</option>
              {ntrpOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {showNtrpHelp ? (
              <p className="helper-copy">
                NTRP — это шкала уровня игры в теннис. Сейчас вы указываете самооценку, а позже
                уровень можно будет подтвердить через клуб или партнера.
              </p>
            ) : null}
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
                      ? 'Загружаем районы и округа...'
                      : 'Выберите район или округ'}
                </option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Card>
      </div>

      <Card>
        <h3>О себе</h3>
        <label className="field">
          <span>Коротко о себе</span>
          <textarea
            value={form.bio}
            placeholder="Например: играю 2 раза в неделю, предпочитаю хард, ищу соперников уровня 3.0–3.5 по вечерам."
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            disabled={!session}
          />
        </label>
      </Card>

      <Card>
        <div className="action-row">
          <div>
            <h3>{profile ? 'Сохранение изменений' : 'Создание профиля'}</h3>
            <p className="muted">
              После сохранения данные появятся в вашем профиле и будут доступны для следующих шагов
              платформы.
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
