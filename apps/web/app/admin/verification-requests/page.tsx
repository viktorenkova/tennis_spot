'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { formatPartnerVerificationStatus, formatVerificationRequestStatus } from '../../../src/lib/labels';
import { hasRole, useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice } from '../../../src/components/ui';

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
      setError(response.error?.message ?? 'Не удалось загрузить очередь заявок на верификацию.');
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
      title="Очередь заявок на верификацию"
      description="Список заявок для администратора с фильтрацией и переходом в карточку модерации."
    >
      {!isLoaded ? <Notice>Загрузка сессии...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Перед открытием очереди войдите как `demo-admin`.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">Эта страница доступна только ролям admin и superadmin.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card>
        <h3>Фильтры очереди</h3>
        <label className="field">
          <span>Статус</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Все статусы</option>
            <option value="submitted">Отправлена</option>
            <option value="in_review">На рассмотрении</option>
            <option value="approved">Одобрена</option>
            <option value="rejected">Отклонена</option>
            <option value="needs_correction">Требует исправлений</option>
          </select>
        </label>
      </Card>

      <Card>
        <h3>Заявки на верификацию</h3>
        {loading ? <p className="muted">Загрузка очереди...</p> : null}
        {!loading && items.length === 0 ? (
          <p className="muted">Для выбранного фильтра заявки не найдены.</p>
        ) : null}

        <div className="list-stack">
          {items.map((item) => (
            <Link key={item.id} href={`/admin/verification-requests/${item.id}`} className="list-row">
              <span>
                <strong>{item.partnerProfile.brandName ?? item.partnerProfile.legalName}</strong>
                <br />
                <span className="muted">
                  {item.partnerProfile.ownerUser.phone} · {formatPartnerVerificationStatus(item.partnerProfile.verificationStatus)}
                </span>
              </span>
              <span>{formatVerificationRequestStatus(item.status)}</span>
            </Link>
          ))}
        </div>
      </Card>
    </DemoShell>
  );
}
