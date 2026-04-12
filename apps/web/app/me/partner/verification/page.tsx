'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../../src/lib/api';
import {
  formatDateTime,
  formatDocumentType,
  formatPartnerVerificationStatus,
  formatVerificationRequestStatus,
  getPartnerVerificationStatusTone,
  getVerificationRequestStatusTone,
} from '../../../../src/lib/labels';
import { useDemoSession } from '../../../../src/lib/session';
import { DemoShell } from '../../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../../src/components/ui';

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

const documentTypeOptions = [
  { value: 'registration_certificate', label: 'Регистрационный документ' },
  { value: 'tax_document', label: 'Налоговый документ' },
  { value: 'charter', label: 'Учредительный документ' },
  { value: 'other', label: 'Другой документ' },
] as const;

export default function PartnerVerificationPage() {
  const { session, isLoaded } = useDemoSession();
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [documentType, setDocumentType] =
    useState<(typeof documentTypeOptions)[number]['value']>('registration_certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) {
      return;
    }

    setError(null);

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
    } else {
      setError(partnerResponse.error?.message ?? 'Не удалось загрузить профиль партнера.');
    }

    if (requestResponse.success) {
      setRequest(requestResponse.data ?? null);
    } else if (requestResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(requestResponse.error?.message ?? 'Не удалось загрузить заявку на верификацию.');
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedFileSummary = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    const sizeKb = Math.max(1, Math.round(selectedFile.size / 1024));
    return `${selectedFile.name} · ${sizeKb} КБ`;
  }, [selectedFile]);

  const addDocument = async () => {
    if (!session) {
      return;
    }

    if (!selectedFile) {
      setError('Сначала выберите файл документа.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest('/partner/verification/documents', {
      method: 'POST',
      session,
      body: JSON.stringify({
        documentType,
        originalName: selectedFile.name,
        storageKey: `demo/${Date.now()}-${selectedFile.name}`,
        mimeType: selectedFile.type || 'application/octet-stream',
        sizeBytes: selectedFile.size || 1,
      }),
    });

    if (!response.success) {
      setError(response.error?.message ?? 'Не удалось добавить документ.');
      setLoading(false);
      return;
    }

    setSelectedFile(null);
    setMessage('Документ добавлен к заявке.');
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

    setRequest(response.data ?? null);
    setMessage('Заявка отправлена на проверку.');
    setLoading(false);
    await loadData();
  };

  return (
    <DemoShell
      title="Верификация партнёра"
      description="Проверьте статус профиля, прикрепите документы и отправьте заявку на рассмотрение."
    >
      {!isLoaded ? <Notice>Загружаем данные аккаунта...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">
          Сначала войдите через страницу демо-входа, а затем откройте верификацию партнера.
        </Notice>
      ) : null}
      {!partnerProfile && session ? (
        <Notice kind="error">
          Сначала сохраните профиль партнера. После этого можно переходить к верификации.
        </Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {partnerProfile ? (
        <div className="split-grid">
          <Card accent>
            <div className="card-header-row">
              <h3>Статус профиля</h3>
              <StatusBadge tone={getPartnerVerificationStatusTone(partnerProfile.verificationStatus)}>
                {formatPartnerVerificationStatus(partnerProfile.verificationStatus)}
              </StatusBadge>
            </div>
            <p className="session-line">
              <strong>Партнёр:</strong> {partnerProfile.legalName}
            </p>
            <p className="muted">
              Этот статус показывает, можно ли отправлять заявку и какое решение уже принято по
              профилю.
            </p>
          </Card>

          <Card>
            <div className="card-header-row">
              <h3>Статус заявки</h3>
              <StatusBadge tone={getVerificationRequestStatusTone(request?.status ?? 'draft')}>
                {request ? formatVerificationRequestStatus(request.status) : 'Черновик'}
              </StatusBadge>
            </div>
            <p className="session-line">
              <strong>Отправлена:</strong>{' '}
              {formatDateTime(request?.submittedAt ?? null, 'Заявка еще не отправлена')}
            </p>
            <p className="session-line">
              <strong>Комментарий администратора:</strong> {request?.comment ?? 'Пока нет комментария'}
            </p>
          </Card>
        </div>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Документы</h3>
          <div className="form-stack">
            <label className="field">
              <span>Тип документа</span>
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(
                    event.target.value as (typeof documentTypeOptions)[number]['value'],
                  )
                }
                disabled={!session || !partnerProfile}
              >
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Название документа</span>
              <input
                value={selectedFile?.name ?? ''}
                placeholder="После выбора файла название появится здесь"
                readOnly
              />
            </label>

            <label className="field">
              <span>Файл</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                disabled={!session || !partnerProfile}
              />
            </label>

            {selectedFileSummary ? <p className="helper-copy">{selectedFileSummary}</p> : null}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={addDocument}
            disabled={!session || !partnerProfile || loading}
          >
            {loading ? 'Добавляем...' : 'Добавить документ'}
          </button>
        </Card>

        <Card>
          <h3>Отправка заявки</h3>
          <p className="muted">
            Когда профиль сохранен, можно отправить заявку на проверку. Прикрепленные документы
            будут показаны администратору на странице модерации.
          </p>
          <div className="info-list compact-list">
            <p>Профиль партнера должен быть сохранен.</p>
            <p>Документы можно добавить заранее или позже, если это потребуется.</p>
            <p>После отправки статус изменится на «На проверке».</p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={submitRequest}
            disabled={!session || !partnerProfile || loading}
          >
            {loading ? 'Отправляем...' : 'Отправить заявку'}
          </button>
        </Card>
      </div>

      <Card>
        <h3>Что уже прикреплено</h3>
        {!request?.documents.length ? (
          <p className="muted">Документы пока не добавлены.</p>
        ) : (
          <ul className="bullet-list">
            {request.documents.map((document) => (
              <li key={document.id}>
                {formatDocumentType(document.documentType)}: {document.file.originalName} (
                {document.file.mimeType || 'тип не указан'})
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DemoShell>
  );
}
