'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../src/components/ui';
import { apiRequest } from '../../../src/lib/api';
import {
  formatComplaintStatus,
  formatComplaintType,
  formatDateTime,
  getComplaintStatusTone,
} from '../../../src/lib/labels';
import { hasRole, useDemoSession } from '../../../src/lib/session';

type Complaint = {
  id: string;
  type: string;
  description: string;
  status: string;
  resolutionComment: string | null;
  createdAt: string;
  createdByUser: {
    phone: string;
    playerProfile: {
      firstName: string;
      lastName: string;
    } | null;
  };
  relatedBookingRequestId: string | null;
  relatedMatchRequestId: string | null;
  relatedBookingRequest: {
    id: string;
    venue: { name: string } | null;
    court: { name: string } | null;
  } | null;
  relatedMatchRequest: {
    id: string;
    status: string;
  } | null;
};

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'На рассмотрении' },
  { value: 'in_review', label: 'В работе' },
  { value: 'resolved', label: 'Решено' },
  { value: 'rejected', label: 'Отклонено' },
];

const typeOptions = [
  { value: '', label: 'Все типы' },
  { value: 'no_show', label: 'Не пришёл на игру' },
  { value: 'late_cancel', label: 'Поздняя отмена' },
  { value: 'bad_behavior', label: 'Плохое поведение' },
  { value: 'court_issue', label: 'Проблема с кортом' },
  { value: 'other', label: 'Другое' },
];

function getUserLabel(complaint: Complaint) {
  const profile = complaint.createdByUser.playerProfile;
  const name = profile ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') : '';

  return name || complaint.createdByUser.phone;
}

function getContextLabel(complaint: Complaint) {
  if (complaint.relatedBookingRequest) {
    return `Booking ${complaint.relatedBookingRequest.venue?.name ?? ''} ${complaint.relatedBookingRequest.court?.name ?? ''}`.trim();
  }

  if (complaint.relatedMatchRequest) {
    return `Match ${complaint.relatedMatchRequest.id}`;
  }

  return 'Контекст не указан';
}

function AdminComplaintsContent() {
  const searchParams = useSearchParams();
  const highlightedComplaintId = searchParams.get('complaintId');
  const { session, isLoaded } = useDemoSession();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [items, setItems] = useState<Complaint[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canUseAdminFlow = hasRole(session, 'admin') || hasRole(session, 'superadmin');

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    if (typeFilter) {
      params.set('type', typeFilter);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<Complaint[]>(`/admin/complaints${query}`, { session });

    setLoading(false);

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось загрузить жалобы.');
      return;
    }

    setItems(response.data);
  }, [session, statusFilter, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(complaintId: string, status: 'in_review' | 'resolved' | 'rejected') {
    if (!session) {
      return;
    }

    setActionId(complaintId);
    setError(null);
    setMessage(null);

    const response = await apiRequest<Complaint>(`/admin/complaints/${complaintId}/status`, {
      session,
      method: 'POST',
      body: JSON.stringify({
        status,
        resolutionComment: comments[complaintId] || undefined,
      }),
    });

    setActionId(null);

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось изменить статус жалобы.');
      return;
    }

    setMessage('Статус жалобы обновлён.');
    await load();
  }

  return (
    <DemoShell
      title="Жалобы"
      description="Минимальный trust & safety контур: принять в работу, решить или отклонить."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? <Notice kind="error">Войдите как demo-admin.</Notice> : null}
      {session && !canUseAdminFlow ? <Notice kind="error">Страница доступна только администратору.</Notice> : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card>
        <div className="split-grid">
          <label className="field">
            <span>Статус</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Тип</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <div className="card-header-row">
          <h3>Список жалоб</h3>
          <StatusBadge tone="neutral">{items.length}</StatusBadge>
        </div>

        {loading ? <p className="muted">Загружаем жалобы...</p> : null}
        {!loading && !items.length ? <p className="muted">Жалоб по выбранным фильтрам нет.</p> : null}

        <div className="list-stack">
          {items.map((complaint) => {
            const isFinal = complaint.status === 'resolved' || complaint.status === 'rejected';

            return (
              <article
                key={complaint.id}
                className={`list-row list-row-detailed${
                  highlightedComplaintId === complaint.id ? ' list-row-highlight' : ''
                }`}
              >
                <div>
                  <strong>{getUserLabel(complaint)}</strong>
                  <span>
                    {formatComplaintType(complaint.type)} • {formatDateTime(complaint.createdAt)}
                  </span>
                  <span>{getContextLabel(complaint)}</span>
                  <p>{complaint.description}</p>
                  <label className="field">
                    <span>Ответ администратора</span>
                    <textarea
                      rows={3}
                      value={comments[complaint.id] ?? complaint.resolutionComment ?? ''}
                      onChange={(event) =>
                        setComments((current) => ({
                          ...current,
                          [complaint.id]: event.target.value,
                        }))
                      }
                      disabled={isFinal}
                    />
                  </label>
                </div>
                <div className="button-row">
                  <StatusBadge tone={getComplaintStatusTone(complaint.status)}>
                    {formatComplaintStatus(complaint.status)}
                  </StatusBadge>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void updateStatus(complaint.id, 'in_review')}
                    disabled={isFinal || complaint.status === 'in_review' || actionId === complaint.id}
                  >
                    Взять в работу
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void updateStatus(complaint.id, 'resolved')}
                    disabled={isFinal || actionId === complaint.id}
                  >
                    Завершить
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void updateStatus(complaint.id, 'rejected')}
                    disabled={isFinal || actionId === complaint.id}
                  >
                    Отклонить
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </DemoShell>
  );
}

export default function AdminComplaintsPage() {
  return (
    <Suspense fallback={<Notice>Загружаем жалобы...</Notice>}>
      <AdminComplaintsContent />
    </Suspense>
  );
}
