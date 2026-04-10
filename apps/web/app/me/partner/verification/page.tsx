'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../../src/lib/api';
import {
  formatDateTime,
  formatDocumentType,
  formatPartnerVerificationStatus,
  formatVerificationRequestStatus,
} from '../../../../src/lib/labels';
import { useDemoSession } from '../../../../src/lib/session';
import { DemoShell } from '../../../../src/components/demo-shell';
import { Card, Notice } from '../../../../src/components/ui';

type PartnerProfile = {
  id: string;
  legalName: string;
  verificationStatus: string;
};

type VerificationRequest = {
  id: string;
  status: string;
  submittedAt: string | null;
  comment: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    file: {
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    };
  }>;
};

export default function PartnerVerificationPage() {
  const { session, isLoaded } = useDemoSession();
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [docForm, setDocForm] = useState({
    documentType: 'registration_certificate',
    originalName: 'registration-certificate.pdf',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    const [partnerResponse, requestResponse] = await Promise.all([
      apiRequest<PartnerProfile | null>('/partner/profile/me', {
        session,
      }),
      apiRequest<VerificationRequest | null>('/partner/verification/me', {
        session,
      }),
    ]);

    if (partnerResponse.success) {
      setPartnerProfile(partnerResponse.data ?? null);
    }

    if (requestResponse.success) {
      setRequest(requestResponse.data ?? null);
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addDemoDocument = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest('/partner/verification/documents', {
      method: 'POST',
      session,
      body: JSON.stringify({
        documentType: docForm.documentType,
        originalName: docForm.originalName,
        storageKey: `demo/${Date.now()}-${docForm.originalName}`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      }),
    });

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось добавить демо-документ.');
      setLoading(false);
      return;
    }

    setMessage('Демо-документ для верификации добавлен.');
    setLoading(false);
    await loadData();
  };

  const submitRequest = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<VerificationRequest>('/partner/verification/submit', {
      method: 'POST',
      session,
    });

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось отправить заявку на верификацию.');
      setLoading(false);
      return;
    }

    setMessage('Заявка на верификацию отправлена.');
    setRequest(response.data ?? null);
    setLoading(false);
    await loadData();
  };

  return (
    <DemoShell
      title="Верификация партнера"
      description="На этой странице можно проверить текущий статус, добавить демо-документ и отправить заявку в очередь модерации."
    >
      {!isLoaded ? <Notice>Загрузка сессии...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите через страницу демо-входа, а затем откройте верификацию партнера.</Notice>
      ) : null}
      {!partnerProfile && session ? (
        <Notice kind="error">Сначала создайте профиль партнера. Без него заявку на верификацию отправить нельзя.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {partnerProfile ? (
        <Card accent>
          <h3>Текущее состояние верификации</h3>
          <p className="session-line">
            <strong>Партнер:</strong> {partnerProfile.legalName}
          </p>
          <p className="session-line">
            <strong>Статус партнера:</strong> {formatPartnerVerificationStatus(partnerProfile.verificationStatus)}
          </p>
          <p className="session-line">
            <strong>Последняя заявка:</strong>{' '}
            {request ? formatVerificationRequestStatus(request.status) : 'Заявки пока нет'}
          </p>
        </Card>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Добавить демо-документ</h3>
          <div className="form-grid">
            <label className="field">
              <span>Тип документа</span>
              <input
                value={docForm.documentType}
                onChange={(event) =>
                  setDocForm((current) => ({ ...current, documentType: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Исходное имя файла</span>
              <input
                value={docForm.originalName}
                onChange={(event) =>
                  setDocForm((current) => ({ ...current, originalName: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={addDemoDocument}
            disabled={!session || !partnerProfile || loading}
          >
            {loading ? 'Выполняем...' : 'Добавить демо-документ'}
          </button>
        </Card>

        <Card>
          <h3>Отправить на верификацию</h3>
          <p className="muted">
            В этом срезе поток намеренно упрощен. Документы в демо необязательны, но если вы их
            добавите, администратор увидит их на странице модерации.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={submitRequest}
            disabled={!session || !partnerProfile || loading}
          >
            {loading ? 'Отправляем...' : 'Отправить заявку на верификацию'}
          </button>
        </Card>
      </div>

      <Card>
        <h3>Детали текущей заявки</h3>
        {!request ? <p className="muted">Заявка на верификацию еще не создана.</p> : null}
        {request ? (
          <>
            <p className="session-line">
              <strong>Статус:</strong> {formatVerificationRequestStatus(request.status)}
            </p>
            <p className="session-line">
              <strong>Отправлена:</strong> {formatDateTime(request.submittedAt, 'Еще не отправлена')}
            </p>
            <p className="session-line">
              <strong>Комментарий:</strong> {request.comment ?? 'Комментария нет'}
            </p>
            <ul className="bullet-list">
              {request.documents.map((document) => (
                <li key={document.id}>
                  {formatDocumentType(document.documentType)}: {document.file.originalName} ({document.file.mimeType})
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </DemoShell>
  );
}
