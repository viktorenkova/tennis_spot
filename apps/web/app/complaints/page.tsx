'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import {
  formatComplaintStatus,
  formatComplaintType,
  formatDateTime,
  getComplaintStatusTone,
} from '../../src/lib/labels';
import { useDemoSession } from '../../src/lib/session';

type Complaint = {
  id: string;
  type: string;
  description: string;
  status: string;
  resolutionComment: string | null;
  createdAt: string;
  targetUserId: string | null;
  relatedBookingRequestId: string | null;
  relatedMatchRequestId: string | null;
  relatedBookingRequest: {
    id: string;
    status: string;
    bookingDate: string;
    timeFrom: string;
    timeTo: string;
    venue: { name: string } | null;
    court: { name: string } | null;
  } | null;
  relatedMatchRequest: {
    id: string;
    status: string;
    proposedDate: string;
    proposedTimeFrom: string;
    proposedTimeTo: string;
    format: string;
  } | null;
};

const complaintTypeOptions = [
  { value: 'no_show', label: 'Не пришёл на игру' },
  { value: 'late_cancel', label: 'Поздняя отмена' },
  { value: 'bad_behavior', label: 'Плохое поведение' },
  { value: 'court_issue', label: 'Проблема с кортом' },
  { value: 'other', label: 'Другое' },
];

function getContextLabel(complaint: Complaint) {
  if (complaint.relatedBookingRequest) {
    return `Booking: ${complaint.relatedBookingRequest.venue?.name ?? 'площадка'} / ${complaint.relatedBookingRequest.court?.name ?? 'корт'}`;
  }

  if (complaint.relatedMatchRequest) {
    return `Match: ${formatDateTime(complaint.relatedMatchRequest.proposedDate, 'дата не указана')}`;
  }

  if (complaint.targetUserId) {
    return 'Пользователь';
  }

  return 'Контекст не указан';
}

function ComplaintsContent() {
  const searchParams = useSearchParams();
  const { session, isLoaded } = useDemoSession();
  const [type, setType] = useState('other');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const context = useMemo(
    () => ({
      targetUserId: searchParams.get('targetUserId') || undefined,
      relatedBookingRequestId: searchParams.get('relatedBookingRequestId') || undefined,
      relatedMatchRequestId: searchParams.get('relatedMatchRequestId') || undefined,
    }),
    [searchParams],
  );

  const hasContext = Boolean(
    context.targetUserId || context.relatedBookingRequestId || context.relatedMatchRequestId,
  );

  const selectedComplaint =
    complaints.find((complaint) => complaint.id === selectedComplaintId) ?? complaints[0] ?? null;

  const loadComplaints = useCallback(async () => {
    if (!session) {
      return;
    }

    const response = await apiRequest<Complaint[]>('/complaints/me', { session });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось загрузить жалобы.');
      return;
    }

    setComplaints(response.data);
  }, [session]);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  async function submitComplaint() {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await apiRequest<Complaint>('/complaints', {
      session,
      method: 'POST',
      body: JSON.stringify({
        type,
        description,
        ...context,
      }),
    });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось отправить жалобу.');
      return;
    }

    setMessage('Жалоба отправлена администратору.');
    setDescription('');
    setSelectedComplaintId(response.data.id);
    await loadComplaints();
  }

  return (
    <DemoShell
      title="Мои жалобы"
      description="Короткий канал для фиксации проблем по booking, match или другому участнику."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? <Notice kind="error">Войдите в демо-аккаунт, чтобы отправить жалобу.</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <div className="card-header-row">
            <h3>Новая жалоба</h3>
            {hasContext ? <StatusBadge tone="neutral">контекст выбран</StatusBadge> : null}
          </div>

          {!hasContext ? (
            <p className="muted">Откройте booking или match и нажмите «Пожаловаться».</p>
          ) : (
            <div className="form-grid">
              <label className="field">
                <span>Тип</span>
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  {complaintTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Описание</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Коротко опишите, что произошло"
                />
              </label>

              <button
                type="button"
                className="primary-button"
                onClick={() => void submitComplaint()}
                disabled={loading || !session}
              >
                {loading ? 'Отправляем...' : 'Отправить жалобу'}
              </button>
            </div>
          )}
        </Card>

        <Card>
          <div className="card-header-row">
            <h3>Карточка жалобы</h3>
            {selectedComplaint ? (
              <StatusBadge tone={getComplaintStatusTone(selectedComplaint.status)}>
                {formatComplaintStatus(selectedComplaint.status)}
              </StatusBadge>
            ) : null}
          </div>

          {!selectedComplaint ? (
            <p className="muted">Пока нет жалоб.</p>
          ) : (
            <div className="details-list">
              <p>
                <strong>Тип:</strong> {formatComplaintType(selectedComplaint.type)}
              </p>
              <p>
                <strong>Контекст:</strong> {getContextLabel(selectedComplaint)}
              </p>
              <p>{selectedComplaint.description}</p>
              <p>
                <strong>Ответ администратора:</strong>{' '}
                {selectedComplaint.resolutionComment || 'Пока нет'}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="card-header-row">
          <h3>Мои жалобы</h3>
          <StatusBadge tone="neutral">{complaints.length}</StatusBadge>
        </div>

        {!complaints.length ? (
          <p className="muted">После отправки жалобы появятся здесь.</p>
        ) : (
          <div className="list-stack">
            {complaints.map((complaint) => (
              <button
                key={complaint.id}
                type="button"
                className="list-row list-row-detailed"
                onClick={() => setSelectedComplaintId(complaint.id)}
              >
                <div>
                  <strong>{formatComplaintType(complaint.type)}</strong>
                  <span>{complaint.description.slice(0, 140)}</span>
                  <span>{formatDateTime(complaint.createdAt)}</span>
                </div>
                <StatusBadge tone={getComplaintStatusTone(complaint.status)}>
                  {formatComplaintStatus(complaint.status)}
                </StatusBadge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </DemoShell>
  );
}

export default function ComplaintsPage() {
  return (
    <Suspense fallback={<Notice>Загружаем жалобы...</Notice>}>
      <ComplaintsContent />
    </Suspense>
  );
}
