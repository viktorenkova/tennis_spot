'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
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
  userId: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  ntrpSelfRating: number | string | null;
  city: City | null;
  district: District | null;
};

type Filters = {
  cityId: string;
  districtId: string;
  ntrp: string;
};

const initialFilters: Filters = {
  cityId: '',
  districtId: '',
  ntrp: '',
};

function formatNtrp(value: number | string | null) {
  if (value === null || value === '') {
    return 'NTRP не указан';
  }

  return `NTRP ${value}`;
}

function getPlayerName(player: PlayerProfile) {
  return [player.firstName, player.lastName].filter(Boolean).join(' ');
}

export default function PlayersPage() {
  const { session, isLoaded } = useDemoSession();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDistricts = useCallback(async (cityId: string) => {
    if (!cityId) {
      setDistricts([]);
      return;
    }

    setDistrictsLoading(true);
    const response = await apiRequest<District[]>(`/reference/cities/${cityId}/districts`);

    if (response.success && response.data) {
      setDistricts(response.data);
    } else {
      setDistricts([]);
      setError(response.error?.message ?? 'Не удалось загрузить районы.');
    }

    setDistrictsLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    const [playersResponse, citiesResponse] = await Promise.all([
      apiRequest<PlayerProfile[]>('/players', { session }),
      apiRequest<City[]>('/reference/cities'),
    ]);

    if (playersResponse.success && playersResponse.data) {
      setPlayers(playersResponse.data);
    } else {
      setError(playersResponse.error?.message ?? 'Не удалось загрузить каталог игроков.');
    }

    if (citiesResponse.success && citiesResponse.data) {
      setCities(citiesResponse.data);
    } else {
      setError(citiesResponse.error?.message ?? 'Не удалось загрузить список городов.');
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPlayers = useMemo(
    () =>
      players.filter((player) => {
        if (session?.user?.id && player.userId === session.user.id) {
          return false;
        }

        if (filters.cityId && player.city?.id !== filters.cityId) {
          return false;
        }

        if (filters.districtId && player.district?.id !== filters.districtId) {
          return false;
        }

        if (filters.ntrp) {
          const ntrp = Number(player.ntrpSelfRating);
          const selected = Number(filters.ntrp);

          if (Number.isNaN(ntrp) || Math.abs(ntrp - selected) > 0.25) {
            return false;
          }
        }

        return true;
      }),
    [filters, players, session?.user?.id],
  );

  return (
    <DemoShell
      title="Каталог игроков"
      description="Найдите игрока вручную по базовым параметрам и отправьте ему вызов на игру."
    >
      {!isLoaded ? <Notice>Проверяем текущую демо-сессию...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите через страницу демо-входа.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card accent>
        <h3>Фильтры</h3>
        <p className="muted">Это не алгоритм подбора, а простой каталог видимых игроков.</p>
        <div className="form-stack">
          <label className="field">
            <span>Город</span>
            <select
              value={filters.cityId}
              onChange={(event) => {
                const cityId = event.target.value;
                setFilters((current) => ({ ...current, cityId, districtId: '' }));
                void loadDistricts(cityId);
              }}
              disabled={loading}
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
              value={filters.districtId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, districtId: event.target.value }))
              }
              disabled={!filters.cityId || districtsLoading || loading}
            >
              <option value="">
                {!filters.cityId
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
            <span>Уровень NTRP</span>
            <select
              value={filters.ntrp}
              onChange={(event) =>
                setFilters((current) => ({ ...current, ntrp: event.target.value }))
              }
              disabled={loading}
            >
              <option value="">Любой уровень</option>
              {['2.5', '3.0', '3.5', '4.0', '4.5', '5.0'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="card-header-row">
          <h3>Игроки</h3>
          <StatusBadge tone="neutral">{filteredPlayers.length}</StatusBadge>
        </div>

        {loading ? <Notice>Загружаем игроков...</Notice> : null}

        {!loading && !filteredPlayers.length ? (
          <Notice>
            По выбранным фильтрам пока нет игроков. Попробуйте изменить город, район или уровень.
          </Notice>
        ) : null}

        {filteredPlayers.length ? (
          <div className="list-stack">
            {filteredPlayers.map((player) => (
              <Link key={player.id} href={`/players/${player.id}`} className="list-row list-row-detailed">
                <div>
                  <strong>{getPlayerName(player)}</strong>
                  <span>
                    {[player.city?.name, player.district?.name].filter(Boolean).join(', ') ||
                      'Город не указан'}
                  </span>
                  <span>{formatNtrp(player.ntrpSelfRating)}</span>
                  <span>{player.bio ?? 'Описание пока не заполнено'}</span>
                </div>
                <StatusBadge tone="success">Открыть</StatusBadge>
              </Link>
            ))}
          </div>
        ) : null}
      </Card>
    </DemoShell>
  );
}
