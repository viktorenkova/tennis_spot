'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../src/components/ui';
import { apiRequest } from '../../../src/lib/api';
import { formatDate, formatMatchRequestFormat } from '../../../src/lib/labels';
import { useDemoSession } from '../../../src/lib/session';

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

type MatchRequest = {
  id: string;
  status: string;
  proposedDate: string;
  proposedTimeFrom: string;
  proposedTimeTo: string;
  format: string;
  message: string | null;
};

type ChallengeForm = {
  proposedDate: string;
  proposedTimeFrom: string;
  proposedTimeTo: string;
  format: 'singles' | 'doubles';
  message: string;
};

const initialForm: ChallengeForm = {
  proposedDate: '',
  proposedTimeFrom: '18:00',
  proposedTimeTo: '19:30',
  format: 'singles',
  message: '',
};

function getPlayerName(player: PlayerProfile) {
  return [player.firstName, player.lastName].filter(Boolean).join(' ');
}

function formatNtrp(value: number | string | null) {
  return value ? `NTRP ${value}` : 'NTRP не указан';
}

export default function PlayerDetailsPage() {
  const params = useParams<{ id: string }>();
  const { session, isLoaded } = useDemoSession();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [form, setForm] = useState<ChallengeForm>(initialForm);
  const [createdRequest, setCreatedRequest] = useState<MatchRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const playerId = params.id;
  const isOwnProfile = Boolean(session?.user?.id && player?.userId === session.user.id);

  const loadPlayer = useCallback(async () => {
    if (!session || !playerId) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await apiRequest<PlayerProfile>(`/players/${playerId}`, { session });

    if (response.success && response.data) {
      setPlayer(response.data);
    } else {
      setError(response.error?.message ?? 'Не удалось загрузить карточку игрока.');
    }

    setLoading(false);
  }, [playerId, session]);

  useEffect(() => {
    void loadPlayer();
  }, [loadPlayer]);

  async function sendChallenge() {
    if (!session || !player) {
      return;
    }

    if (isOwnProfile) {
      setError('Нельзя отправить вызов самому себе.');
      return;
    }

    if (!form.proposedDate || !form.proposedTimeFrom || !form.proposedTimeTo) {
      setError('Укажите дату и время вызова.');
      return;
    }

    if (form.proposedTimeTo <= form.proposedTimeFrom) {
      setError('Время окончания должно быть позже времени начала.');
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    const response = await apiRequest<MatchRequest>('/match-requests', {
      method: 'POST',
      session,
      body: JSON.stringify({
        opponentId: player.userId,
        proposedDate: form.proposedDate,
        proposedTimeFrom: form.proposedTimeFrom,
        proposedTimeTo: form.proposedTimeTo,
        format: form.format,
        message: form.message || undefined,
      }),
    });

    setSending(false);

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось отправить вызов.');
      return;
    }

    setCreatedRequest(response.data);
    setMessage('Вызов отправлен.');
  }

  return (
    <DemoShell
      title="Карточка игрока"
      description="Посмотрите информацию об игроке и предложите сыграть."
    >
      {!isLoaded ? <Notice>Проверяем текущую демо-сессию...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите через страницу демо-входа.</Notice>
      ) : null}
      {loading ? <Notice>Загружаем игрока...</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {isOwnProfile ? (
        <Notice>Это ваш профиль. Отправить вызов самому себе нельзя.</Notice>
      ) : null}

      {player ? (
        <div className="split-grid">
          <Card accent>
            <h3>{getPlayerName(player)}</h3>
            <div className="info-list">
              <p>
                <strong>Город:</strong> {player.city?.name ?? 'Не указан'}
              </p>
              <p>
                <strong>Район:</strong> {player.district?.name ?? 'Не указан'}
              </p>
              <p>
                <strong>Уровень:</strong> {formatNtrp(player.ntrpSelfRating)}
              </p>
              <p>
                <strong>О себе:</strong> {player.bio ?? 'Игрок пока не добавил информацию о себе'}
              </p>
            </div>
          </Card>

          <Card>
            <h3>Бросить вызов</h3>
            <p className="muted">Предложите дату, время и формат игры.</p>
            <div className="form-stack">
              <label className="field">
                <span>Дата</span>
                <input
                  type="date"
                  value={form.proposedDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, proposedDate: event.target.value }))
                  }
                  disabled={sending}
                />
              </label>

              <div className="split-grid">
                <label className="field">
                  <span>С</span>
                  <input
                    type="time"
                    value={form.proposedTimeFrom}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, proposedTimeFrom: event.target.value }))
                    }
                    disabled={sending}
                  />
                </label>
                <label className="field">
                  <span>До</span>
                  <input
                    type="time"
                    value={form.proposedTimeTo}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, proposedTimeTo: event.target.value }))
                    }
                    disabled={sending}
                  />
                </label>
              </div>

              <label className="field">
                <span>Формат</span>
                <select
                  value={form.format}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      format: event.target.value as ChallengeForm['format'],
                    }))
                  }
                  disabled={sending}
                >
                  <option value="singles">Одиночная игра</option>
                  <option value="doubles">Парная игра</option>
                </select>
              </label>

              <label className="field">
                <span>Сообщение</span>
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  disabled={sending}
                  placeholder="Например: сыграем тренировочный сет?"
                />
              </label>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => void sendChallenge()}
              disabled={sending || !session || isOwnProfile}
              style={{ marginTop: 16 }}
            >
              {sending ? 'Отправляем...' : 'Отправить вызов'}
            </button>
          </Card>
        </div>
      ) : null}

      {createdRequest ? (
        <Card>
          <div className="card-header-row">
            <h3>Отправленный вызов</h3>
            <StatusBadge tone="warning">Ожидает ответа</StatusBadge>
          </div>
          <p>
            {formatDate(createdRequest.proposedDate)} • {createdRequest.proposedTimeFrom} -{' '}
            {createdRequest.proposedTimeTo} • {formatMatchRequestFormat(createdRequest.format)}
          </p>
        </Card>
      ) : null}
    </DemoShell>
  );
}
