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
  getPartnerVerificationStatusTone,
  getVerificationRequestStatusTone,
} from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';
import { DemoShell } from './demo-shell';
import { Card, Notice, StatusBadge } from './ui';

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

    const body = action === 'approve' ? { comment: comment || undefined } : { comment };
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

    const actionMessage =
      action === 'approve'
        ? 'Заявка подтверждена.'
        : action === 'reject'
          ? 'Заявка отклонена.'
          : 'По заявке запрошены уточнения.';

    setMessage(actionMessage);
    setLoading(false);
    await load();
  };

  return (
    <DemoShell
      title="Детали заявки на верификацию"
      description="Проверьте статус, документы и профиль партнёра, затем выберите решение по заявке."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Перед открытием заявки войдите как demo-admin.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">Эта страница доступна только администратору.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {details ? (
        <>
          <div className="split-grid">
            <Card accent>
              <div className="card-header-row">
                <h3>Состояние заявки</h3>
                <StatusBadge tone={getVerificationRequestStatusTone(details.status)}>
                  {formatVerificationRequestStatus(details.status)}
                </StatusBadge>
              </div>
              <p className="session-line">
                <strong>Отправлена:</strong>{' '}
                {formatDateTime(details.submittedAt, 'Дата не указана')}
              </p>
              <p className="session-line">
                <strong>Последнее решение:</strong>{' '}
                {formatDateTime(details.reviewedAt, 'Решение еще не принято')}
              </p>
              <p className="session-line">
                <strong>Комментарий по заявке:</strong> {details.comment ?? 'Комментария пока нет'}
              </p>
            </Card>

            <Card>
              <div className="card-header-row">
                <h3>Состояние партнёра</h3>
                <StatusBadge
                  tone={getPartnerVerificationStatusTone(details.partnerProfile.verificationStatus)}
                >
                  {formatPartnerVerificationStatus(details.partnerProfile.verificationStatus)}
                </StatusBadge>
              </div>
              <p className="session-line">
                <strong>Название:</strong>{' '}
                {details.partnerProfile.brandName ?? details.partnerProfile.legalName}
              </p>
              <p className="session-line">
                <strong>Телефон:</strong> {details.partnerProfile.ownerUser.phone}
              </p>
              <p className="session-line">
                <strong>Формат работы:</strong>{' '}
                {details.partnerProfile.profileTypes
                  .map(({ partnerType }) => formatPartnerType(partnerType.key))
                  .join(', ')}
              </p>
              <p className="muted">
                {details.partnerProfile.description ?? 'Информация для игроков пока не заполнена.'}
              </p>
            </Card>
          </div>

          <Card>
            <h3>Решение администратора</h3>
            <label className="field">
              <span>Комментарий для партнёра</span>
              <textarea
                value={comment}
                placeholder="Например: документы читаются хорошо, профиль можно подтверждать."
                onChange={(event) => setComment(event.target.value)}
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => runAction('approve')}
                disabled={loading}
              >
                Подтвердить
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => runAction('needsCorrection')}
                disabled={loading}
              >
                Запросить уточнения
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

          <div className="split-grid">
            <Card>
              <h3>Прикрепленные документы</h3>
              {!details.documents.length ? (
                <p className="muted">Документы к заявке пока не прикреплены.</p>
              ) : (
                <ul className="bullet-list">
                  {details.documents.map((document) => (
                    <li key={document.id}>
                      {formatDocumentType(document.documentType)}: {document.file.originalName}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3>История действий</h3>
              {!details.auditLogs.length ? (
                <p className="muted">По заявке пока нет записей в журнале.</p>
              ) : (
                <ul className="audit-list">
                  {details.auditLogs.map((log) => (
                    <li key={log.id} className="audit-item">
                      <div className="audit-item-header">
                        <strong>{formatAuditAction(log.action)}</strong>
                        <span className="audit-meta">
                          {log.actorUser?.phone ?? 'Система'} · {formatDateTime(log.createdAt)}
                        </span>
                      </div>
                      {log.comment ? <p className="audit-comment">{log.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </DemoShell>
  );
}
