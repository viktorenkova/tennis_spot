'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import {
  formatDateTime,
  formatPartnerVerificationStatus,
  formatVerificationRequestStatus,
  getVerificationRequestStatusTone,
} from '../../../src/lib/labels';
import { hasRole, useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../src/components/ui';

type VerificationRequestListItem = {
  id: string;
  status: string;
  submittedAt: string | null;
  partnerProfile: {
    id: string;
    legalName: string;
    brandName: string | null;
    verificationStatus: string;
    ownerUser: {
      phone: string;
    };
  };
};

export default function AdminVerificationRequestsPage() {
  const { session, isLoaded } = useDemoSession();
  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState<VerificationRequestListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);

    const query = statusFilter ? `?status=${statusFilter}` : '';
    const response = await apiRequest<VerificationRequestListItem[]>(
      `/admin/verification-requests${query}`,
      {
        session,
      },
    );

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось загрузить список заявок.');
      setLoading(false);
      return;
    }

    setItems(response.data);
    setLoading(false);
  }, [session, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const canUseAdminFlow = hasRole(session, 'admin') || hasRole(session, 'superadmin');

  return (
    <DemoShell
      title="Заявки на верификацию"
      description="Откройте заявку, проверьте данные партнера и перейдите к решению по модерации."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Перед открытием очереди войдите как demo-admin.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">Эта страница доступна только администратору.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card>
          <h3>Как работать с очередью</h3>
          <ol className="ordered-list">
            <li>Выберите нужный статус или оставьте список без фильтра.</li>
            <li>Откройте карточку партнера.</li>
            <li>Проверьте документы и комментарии.</li>
            <li>Примите решение: подтвердить, отклонить или запросить уточнения.</li>
          </ol>
        </Card>

        <Card>
          <h3>Фильтр</h3>
          <label className="field">
            <span>Показывать заявки со статусом</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Все заявки</option>
              <option value="submitted">На проверке</option>
              <option value="in_review">На рассмотрении</option>
              <option value="approved">Подтвержденные</option>
              <option value="rejected">Отклоненные</option>
              <option value="needs_correction">Требуют уточнений</option>
            </select>
          </label>
        </Card>
      </div>

      <Card>
        <div className="card-header-row">
          <h3>Очередь модерации</h3>
          <StatusBadge tone="neutral">{items.length}</StatusBadge>
        </div>

        {loading ? <p className="muted">Загружаем заявки...</p> : null}
        {!loading && items.length === 0 ? (
          <p className="muted">По выбранному фильтру заявок пока нет.</p>
        ) : null}

        <div className="list-stack">
          {items.map((item) => (
            <Link key={item.id} href={`/admin/verification-requests/${item.id}`} className="list-row list-row-detailed">
              <div>
                <strong>{item.partnerProfile.brandName ?? item.partnerProfile.legalName}</strong>
                <p className="helper-copy">
                  {item.partnerProfile.ownerUser.phone} · профиль:{' '}
                  {formatPartnerVerificationStatus(item.partnerProfile.verificationStatus)}
                </p>
                <p className="helper-copy">
                  Отправлена: {formatDateTime(item.submittedAt, 'Дата не указана')}
                </p>
              </div>
              <StatusBadge tone={getVerificationRequestStatusTone(item.status)}>
                {formatVerificationRequestStatus(item.status)}
              </StatusBadge>
            </Link>
          ))}
        </div>
      </Card>
    </DemoShell>
  );
}
