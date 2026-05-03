'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import {
  formatBookingRequestStatus,
  formatDate,
  formatMatchRequestFormat,
  formatMatchRequestStatus,
  getBookingRequestStatusTone,
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
  relatedBooking: {
    id: string;
    status: string;
    venueName: string | null;
    courtName: string | null;
    bookingDate: string;
    timeFrom: string;
    timeTo: string;
  } | null;
  relatedBookingRequest: {
    id: string;
    status: string;
    bookingDate: string;
    timeFrom: string;
    timeTo: string;
    venue: {
      name: string;
    } | null;
    court: {
      name: string;
    } | null;
  } | null;
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

function getPlayersCountForFormat(format: string) {
  return format === 'doubles' ? 4 : 2;
}

function getMatchBookingLabel(status: string) {
  return `Бронь: ${formatBookingRequestStatus(status)}`;
}

function getRelatedBooking(matchRequest: MatchRequest) {
  if (matchRequest.relatedBooking) {
    return matchRequest.relatedBooking;
  }

  if (!matchRequest.relatedBookingRequest) {
    return null;
  }

  return {
    id: matchRequest.relatedBookingRequest.id,
    status: matchRequest.relatedBookingRequest.status,
    venueName: matchRequest.relatedBookingRequest.venue?.name ?? null,
    courtName: matchRequest.relatedBookingRequest.court?.name ?? null,
    bookingDate: matchRequest.relatedBookingRequest.bookingDate,
    timeFrom: matchRequest.relatedBookingRequest.timeFrom,
    timeTo: matchRequest.relatedBookingRequest.timeTo,
  };
}

function MatchBookingBlock({
  matchRequest,
  opponentProfile,
  onCreateBooking,
  onOpenBooking,
}: {
  matchRequest: MatchRequest;
  opponentProfile: PlayerProfile | null;
  onCreateBooking: (matchRequest: MatchRequest, opponentProfile: PlayerProfile | null) => void;
  onOpenBooking: (bookingId: string) => void;
}) {
  const relatedBooking = getRelatedBooking(matchRequest);

  if (matchRequest.status !== 'accepted' && !relatedBooking) {
    return null;
  }

  if (!relatedBooking) {
    return (
      <div className="match-booking-panel">
        <div>
          <strong>Бронирование</strong>
          <span>
            Выберите подходящий корт и отправьте заявку партнёру. Бронь будет связана с этим
            вызовом.
          </span>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => onCreateBooking(matchRequest, opponentProfile)}
        >
          Оформить бронь для этой игры
        </button>
      </div>
    );
  }

  return (
    <div className="match-booking-panel">
      <div>
        <strong>Бронь для игры</strong>
        <span>{formatBookingRequestStatus(relatedBooking.status)}</span>
        <span>
          {relatedBooking.venueName ?? 'Площадка уточняется'} /{' '}
          {relatedBooking.courtName ?? 'корт уточняется'}
        </span>
        <span>
          {formatDate(relatedBooking.bookingDate)} • {relatedBooking.timeFrom} -{' '}
          {relatedBooking.timeTo}
        </span>
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() => onOpenBooking(relatedBooking.id)}
      >
        Перейти к заявке
      </button>
    </div>
  );
}

export default function MatchRequestsPage() {
  const router = useRouter();
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

    const actionMessages = {
      accept: 'Вызов принят.',
      decline: 'Вызов отклонён.',
      cancel: 'Вызов отменён.',
    };
    setMessage(actionMessages[action]);
    await loadData();
  }

  function openBookingFlow(matchRequest: MatchRequest, opponentProfile: PlayerProfile | null) {
    const params = new URLSearchParams({
      matchRequestId: matchRequest.id,
      date: matchRequest.proposedDate.slice(0, 10),
      timeFrom: matchRequest.proposedTimeFrom,
      timeTo: matchRequest.proposedTimeTo,
      playersCount: String(getPlayersCountForFormat(matchRequest.format)),
      opponentName: getPlayerName(opponentProfile),
      format: formatMatchRequestFormat(matchRequest.format),
    });

    router.push(`/booking-requests?${params.toString()}`);
  }

  function openBookingRequest(bookingId: string) {
    router.push(`/booking-requests?bookingRequestId=${bookingId}`);
  }

  function openComplaintForMatch(matchRequestId: string) {
    router.push(`/complaints?relatedMatchRequestId=${matchRequestId}`);
  }

  return (
    <DemoShell
      title="Вызовы на игру"
      description="Входящие и исходящие вызовы между игроками. Примите вызов или предложите сыграть сами."
    >
      {!isLoaded ? <Notice>Проверяем текущую демо-сессию...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите или зарегистрируйтесь по телефону.</Notice>
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
            <p className="muted">У вас пока нет входящих вызовов.</p>
          ) : (
            <div className="list-stack">
              {incoming.map((matchRequest) => (
                <article key={matchRequest.id} className="list-row list-row-detailed match-card">
                  <div className="match-card-main">
                    <div>
                      <strong>{getPlayerName(matchRequest.initiator.playerProfile)}</strong>
                      <span>{getLocation(matchRequest.initiator.playerProfile)}</span>
                      <span>
                        {formatDate(matchRequest.proposedDate)} • {matchRequest.proposedTimeFrom} -{' '}
                        {matchRequest.proposedTimeTo} •{' '}
                        {formatMatchRequestFormat(matchRequest.format)} • Игроков:{' '}
                        {getPlayersCountForFormat(matchRequest.format)}
                      </span>
                      <span>{matchRequest.message ?? 'Сообщение не указано'}</span>
                    </div>
                    <MatchBookingBlock
                      matchRequest={matchRequest}
                      opponentProfile={matchRequest.initiator.playerProfile}
                      onCreateBooking={openBookingFlow}
                      onOpenBooking={openBookingRequest}
                    />
                  </div>
                  <div className="button-row">
                    <StatusBadge tone={getMatchRequestStatusTone(matchRequest.status)}>
                      {formatMatchRequestStatus(matchRequest.status)}
                    </StatusBadge>
                    {getRelatedBooking(matchRequest) ? (
                      <StatusBadge tone={getBookingRequestStatusTone(getRelatedBooking(matchRequest)!.status)}>
                        {getMatchBookingLabel(getRelatedBooking(matchRequest)!.status)}
                      </StatusBadge>
                    ) : null}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openComplaintForMatch(matchRequest.id)}
                    >
                      Пожаловаться
                    </button>
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
            <p className="muted">У вас пока нет вызовов. Найдите игрока и предложите сыграть.</p>
          ) : (
            <div className="list-stack">
              {outgoing.map((matchRequest) => (
                <article key={matchRequest.id} className="list-row list-row-detailed match-card">
                  <div className="match-card-main">
                    <div>
                      <strong>{getPlayerName(matchRequest.opponent.playerProfile)}</strong>
                      <span>{getLocation(matchRequest.opponent.playerProfile)}</span>
                      <span>
                        {formatDate(matchRequest.proposedDate)} • {matchRequest.proposedTimeFrom} -{' '}
                        {matchRequest.proposedTimeTo} •{' '}
                        {formatMatchRequestFormat(matchRequest.format)} • Игроков:{' '}
                        {getPlayersCountForFormat(matchRequest.format)}
                      </span>
                      <span>{matchRequest.message ?? 'Сообщение не указано'}</span>
                    </div>
                    <MatchBookingBlock
                      matchRequest={matchRequest}
                      opponentProfile={matchRequest.opponent.playerProfile}
                      onCreateBooking={openBookingFlow}
                      onOpenBooking={openBookingRequest}
                    />
                  </div>
                  <div className="button-row">
                    <StatusBadge tone={getMatchRequestStatusTone(matchRequest.status)}>
                      {formatMatchRequestStatus(matchRequest.status)}
                    </StatusBadge>
                    {getRelatedBooking(matchRequest) ? (
                      <StatusBadge tone={getBookingRequestStatusTone(getRelatedBooking(matchRequest)!.status)}>
                        {getMatchBookingLabel(getRelatedBooking(matchRequest)!.status)}
                      </StatusBadge>
                    ) : null}
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openComplaintForMatch(matchRequest.id)}
                    >
                      Пожаловаться
                    </button>
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
