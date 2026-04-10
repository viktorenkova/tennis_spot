'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import {
  formatAuditAction,
  formatDateTime,
  formatDocumentType,
  formatPartnerType,
  formatPartnerVerificationStatus,
  formatVerificationRequestStatus,
} from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';
import { DemoShell } from './demo-shell';
import { Card, Notice } from './ui';

type VerificationDetails = {
  id: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  comment: string | null;
  partnerProfile: {
    id: string;
    legalName: string;
    brandName: string | null;
    verificationStatus: string;
    description: string | null;
    ownerUser: {
      phone: string;
    };
    profileTypes: Array<{
      partnerType: {
        key: string;
        name: string;
      };
    }>;
  };
  documents: Array<{
    id: string;
    documentType: string;
    file: {
      originalName: string;
      storageKey: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    comment: string | null;
    createdAt: string;
    actorUser: {
      phone: string;
    } | null;
  }>;
};

const actionLabels = {
  approve: 'Одобрить',
  reject: 'Отклонить',
  needsCorrection: 'Вернуть на доработку',
} as const;

export function AdminVerificationRequestDetailsPage({ requestId }: { requestId: string }) {
  const { session, isLoaded } = useDemoSession();
  const [details, setDetails] = useState<VerificationDetails | null>(null);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canUseAdminFlow = hasRole(session, 'admin') || hasRole(session, 'superadmin');

  const load = useCallback(async () => {
    if (!session || !canUseAdminFlow) {
      return;
    }

    const response = await apiRequest<VerificationDetails>(
      `/admin/verification-requests/${requestId}`,
      {
        session,
      },
    );

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось загрузить детали заявки.');
      return;
    }

    setDetails(response.data);
  }, [canUseAdminFlow, requestId, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: 'approve' | 'reject' | 'needsCorrection') => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const body =
      action === 'approve' ? { comment: comment || undefined } : { comment };

    const endpoint =
      action === 'needsCorrection'
        ? `/admin/verification-requests/${requestId}/needs-correction`
        : `/admin/verification-requests/${requestId}/${action}`;

    const response = await apiRequest(endpoint, {
      method: 'POST',
      session,
      body: JSON.stringify(body),
    });

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось выполнить действие по заявке.');
      setLoading(false);
      return;
    }

    setMessage(`Действие "${actionLabels[action]}" выполнено.`);
    setLoading(false);
    await load();
  };

  return (
    <DemoShell
      title="Детали заявки на верификацию"
      description="Экран модерации для администратора со статусом, документами, аудит-логом и управляющими действиями."
    >
      {!isLoaded ? <Notice>Загрузка сессии...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Перед открытием деталей заявки войдите как `demo-admin`.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">Эта страница доступна только ролям admin и superadmin.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {details ? (
        <>
          <div className="split-grid">
            <Card accent>
              <h3>Сводка по заявке</h3>
              <p className="session-line">
                <strong>Статус заявки:</strong> {formatVerificationRequestStatus(details.status)}
              </p>
              <p className="session-line">
                <strong>Статус партнера:</strong>{' '}
                {formatPartnerVerificationStatus(details.partnerProfile.verificationStatus)}
              </p>
              <p className="session-line">
                <strong>Отправлена:</strong> {formatDateTime(details.submittedAt, 'Еще не отправлена')}
              </p>
              <p className="session-line">
                <strong>Рассмотрена:</strong> {formatDateTime(details.reviewedAt, 'Еще не рассмотрена')}
              </p>
            </Card>

            <Card>
              <h3>Профиль партнера</h3>
              <p className="session-line">
                <strong>Название:</strong>{' '}
                {details.partnerProfile.brandName ?? details.partnerProfile.legalName}
              </p>
              <p className="session-line">
                <strong>Телефон:</strong> {details.partnerProfile.ownerUser.phone}
              </p>
              <p className="session-line">
                <strong>Типы:</strong>{' '}
                {details.partnerProfile.profileTypes
                  .map(({ partnerType }) => formatPartnerType(partnerType.key))
                  .join(', ')}
              </p>
              <p className="muted">{details.partnerProfile.description ?? 'Описание не заполнено'}</p>
            </Card>
          </div>

          <Card>
            <h3>Решение по заявке</h3>
            <label className="field">
              <span>Комментарий модератора</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => runAction('approve')}
                disabled={loading}
              >
                Одобрить
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => runAction('needsCorrection')}
                disabled={loading}
              >
                Вернуть на доработку
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => runAction('reject')}
                disabled={loading}
              >
                Отклонить
              </button>
            </div>
          </Card>

          <Card>
            <h3>Документы</h3>
            <ul className="bullet-list">
              {details.documents.map((document) => (
                <li key={document.id}>
                  {formatDocumentType(document.documentType)}: {document.file.originalName} ({document.file.storageKey})
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3>Аудит-лог</h3>
            <ul className="bullet-list">
              {details.auditLogs.map((log) => (
                <li key={log.id}>
                  {formatAuditAction(log.action)} · {log.actorUser?.phone ?? 'система'} ·{' '}
                  {formatDateTime(log.createdAt)}
                  {log.comment ? ` - ${log.comment}` : ''}
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </DemoShell>
  );
}
