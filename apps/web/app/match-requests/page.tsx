'use client';

import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import {
  formatDate,
  formatMatchRequestFormat,
  formatMatchRequestStatus,
  getMatchRequestStatusTone,
} from '../../src/lib/labels';
import { useDemoSession } from '../../src/lib/session';

type PlayerProfile = {
  firstName: string;
  lastName: string;
  ntrpSelfRating: number | string | null;
  city: {
    name: string;
  } | null;
  district: {
    name: string;
  } | null;
};

type MatchRequest = {
  id: string;
  status: string;
  proposedDate: string;
  proposedTimeFrom: string;
  proposedTimeTo: string;
  format: string;
  message: string | null;
  initiator: {
    playerProfile: PlayerProfile | null;
  };
  opponent: {
    playerProfile: PlayerProfile | null;
  };
};

function getPlayerName(profile: PlayerProfile | null) {
  if (!profile) {
    return 'Игрок';
  }

  return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
}

function getLocation(profile: PlayerProfile | null) {
  if (!profile) {
    return 'Локация не указана';
  }

  return [profile.city?.name, profile.district?.name].filter(Boolean).join(', ') || 'Локация не указана';
}

export default function MatchRequestsPage() {
  const { session, isLoaded } = useDemoSession();
  const [incoming, setIncoming] = useState<MatchRequest[]>([]);
  const [outgoing, setOutgoing] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    const [incomingResponse, outgoingResponse] = await Promise.all([
      apiRequest<MatchRequest[]>('/match-requests/incoming', { session }),
      apiRequest<MatchRequest[]>('/match-requests/outgoing', { session }),
    ]);

    if (incomingResponse.success && incomingResponse.data) {
      setIncoming(incomingResponse.data);
    } else {
      setError(incomingResponse.error?.message ?? 'Не удалось загрузить входящие вызовы.');
    }

    if (outgoingResponse.success && outgoingResponse.data) {
      setOutgoing(outgoingResponse.data);
    } else {
      setError(outgoingResponse.error?.message ?? 'Не удалось загрузить исходящие вызовы.');
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function runAction(matchRequestId: string, action: 'accept' | 'decline' | 'cancel') {
    if (!session) {
      return;
    }

    setActionId(matchRequestId);
    setMessage(null);
    setError(null);

    const response = await apiRequest<MatchRequest>(`/match-requests/${matchRequestId}/${action}`, {
      method: 'POST',
      session,
    });

    setActionId(null);

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось изменить статус вызова.');
      return;
    }

    setMessage('Статус вызова обновлён.');
    await loadData();
  }

  return (
    <DemoShell
      title="Вызовы на игру"
      description="Входящие и исходящие ручные вызовы между игроками. Без чата, бронирования и алгоритмов подбора."
    >
      {!isLoaded ? <Notice>Проверяем текущую демо-сессию...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите через страницу демо-входа.</Notice>
      ) : null}
      {loading ? <Notice>Загружаем вызовы...</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <div className="card-header-row">
            <h3>Входящие</h3>
            <StatusBadge tone="neutral">{incoming.length}</StatusBadge>
          </div>
          {!incoming.length ? (
            <p className="muted">Пока никто не отправил вам вызов.</p>
          ) : (
            <div className="list-stack">
              {incoming.map((matchRequest) => (
                <article key={matchRequest.id} className="list-row list-row-detailed">
                  <div>
                    <strong>{getPlayerName(matchRequest.initiator.playerProfile)}</strong>
                    <span>{getLocation(matchRequest.initiator.playerProfile)}</span>
                    <span>
                      {formatDate(matchRequest.proposedDate)} • {matchRequest.proposedTimeFrom} -{' '}
                      {matchRequest.proposedTimeTo} • {formatMatchRequestFormat(matchRequest.format)}
                    </span>
                    <span>{matchRequest.message ?? 'Сообщение не указано'}</span>
                  </div>
                  <div className="button-row">
                    <StatusBadge tone={getMatchRequestStatusTone(matchRequest.status)}>
                      {formatMatchRequestStatus(matchRequest.status)}
                    </StatusBadge>
                    {matchRequest.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void runAction(matchRequest.id, 'accept')}
                          disabled={actionId === matchRequest.id}
                        >
                          Принять
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void runAction(matchRequest.id, 'decline')}
                          disabled={actionId === matchRequest.id}
                        >
                          Отклонить
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header-row">
            <h3>Исходящие</h3>
            <StatusBadge tone="neutral">{outgoing.length}</StatusBadge>
          </div>
          {!outgoing.length ? (
            <p className="muted">Вы ещё не отправляли вызовы другим игрокам.</p>
          ) : (
            <div className="list-stack">
              {outgoing.map((matchRequest) => (
                <article key={matchRequest.id} className="list-row list-row-detailed">
                  <div>
                    <strong>{getPlayerName(matchRequest.opponent.playerProfile)}</strong>
                    <span>{getLocation(matchRequest.opponent.playerProfile)}</span>
                    <span>
                      {formatDate(matchRequest.proposedDate)} • {matchRequest.proposedTimeFrom} -{' '}
                      {matchRequest.proposedTimeTo} • {formatMatchRequestFormat(matchRequest.format)}
                    </span>
                    <span>{matchRequest.message ?? 'Сообщение не указано'}</span>
                  </div>
                  <div className="button-row">
                    <StatusBadge tone={getMatchRequestStatusTone(matchRequest.status)}>
                      {formatMatchRequestStatus(matchRequest.status)}
                    </StatusBadge>
                    {matchRequest.status === 'pending' ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void runAction(matchRequest.id, 'cancel')}
                        disabled={actionId === matchRequest.id}
                      >
                        Отменить
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DemoShell>
  );
}
