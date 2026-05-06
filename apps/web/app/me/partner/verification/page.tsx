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
      setError(partnerResponse.error?.message ?? 'Не удалось загрузить данные профиля.');
    }

    if (requestResponse.success) {
      setRequest(requestResponse.data ?? null);
    } else if (requestResponse.error?.code !== 'PARTNER_PROFILE_NOT_FOUND') {
      setError(requestResponse.error?.message ?? 'Не удалось загрузить заявку.');
    }
  }, [session]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const requestStatus = request?.status ?? 'draft';
  const hasVerificationDocuments = Boolean(request?.documents.length);
  const canAddDocument =
    Boolean(session) &&
    Boolean(partnerProfile) &&
    !loading &&
    requestStatus !== 'approved' &&
    partnerProfile?.verificationStatus !== 'verified';
  const canSubmitRequest =
    Boolean(session) &&
    Boolean(partnerProfile) &&
    !loading &&
    requestStatus !== 'submitted' &&
    requestStatus !== 'in_review' &&
    requestStatus !== 'approved' &&
    hasVerificationDocuments &&
    partnerProfile?.verificationStatus !== 'verified';

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
      setError('Сначала выберите документ.');
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
      setError(response.error?.message ?? 'Не удалось загрузить документ.');
      setLoading(false);
      return;
    }

    setSelectedFile(null);
    setMessage('Документ загружен.');
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
          Сначала войдите или зарегистрируйтесь по телефону, а затем откройте верификацию партнёра.
        </Notice>
      ) : null}
      {!partnerProfile && session ? (
        <Notice kind="error">
          Сначала сохраните профиль партнёра. После этого можно переходить к верификации.
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
              <strong>Партнер:</strong> {partnerProfile.legalName}
            </p>
            <p className="muted">
              Этот статус показывает, можно ли отправлять заявку и какое решение уже принято по
              профилю.
            </p>
          </Card>

          <Card>
            <div className="card-header-row">
              <h3>Статус заявки</h3>
              <StatusBadge tone={getVerificationRequestStatusTone(requestStatus)}>
                {request ? formatVerificationRequestStatus(request.status) : 'Черновик'}
              </StatusBadge>
            </div>
            <p className="session-line">
              <strong>Отправлена:</strong>{' '}
              {formatDateTime(request?.submittedAt ?? null, 'Заявка еще не отправлена')}
            </p>
            <p className="session-line">
              <strong>Комментарий администратора:</strong>{' '}
              {request?.comment ?? 'Пока нет комментария'}
            </p>
          </Card>
        </div>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Документы</h3>
          <div className="form-stack">
            <label className="field">
              <span>Что подтверждает документ</span>
              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(
                    event.target.value as (typeof documentTypeOptions)[number]['value'],
                  )
                }
                disabled={!canAddDocument}
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
                placeholder="После выбора файла имя появится здесь"
                readOnly
              />
            </label>

            <div className="field file-upload-field">
              <span>Файл</span>
              <input
                id="verification-document-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                disabled={!canAddDocument}
              />
              <label className="secondary-button file-upload-button" htmlFor="verification-document-file">
                Выбрать файл
              </label>
            </div>

            {selectedFileSummary ? <p className="helper-copy">{selectedFileSummary}</p> : null}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={addDocument}
            disabled={!canAddDocument}
          >
            {loading ? 'Загрузка...' : 'Прикрепить документ'}
          </button>
        </Card>

        <Card>
          <h3>Отправка заявки</h3>
          <p className="muted">
            Когда профиль сохранен, можно отправить заявку на проверку. Прикрепленные документы
            будут показаны администратору на странице модерации.
          </p>
          {requestStatus === 'submitted' || requestStatus === 'in_review' ? (
            <Notice>
              Заявка уже на модерации. Новые документы прикрепляются к текущей активной заявке, а
              повторная отправка сейчас недоступна.
            </Notice>
          ) : null}
          {partnerProfile && !hasVerificationDocuments && requestStatus !== 'submitted' && requestStatus !== 'in_review' ? (
            <Notice kind="error">
              Перед отправкой заявки добавьте хотя бы один документ.
            </Notice>
          ) : null}
          <div className="info-list compact-list">
            <p>Профиль партнёра должен быть сохранён.</p>
            <p>Для отправки нужен хотя бы один документ.</p>
            <p>После отправки статус изменится на «На проверке».</p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={submitRequest}
            disabled={!canSubmitRequest}
          >
            {loading ? 'Отправляем...' : 'Отправить заявку'}
          </button>
        </Card>
      </div>

      <Card>
        <h3>Что уже прикреплено</h3>
        {!request?.documents.length ? (
          <p className="muted">Документы пока не загружены. Добавьте документ, чтобы отправить заявку.</p>
        ) : (
          <ul className="bullet-list">
            {request.documents.map((document) => (
              <li key={document.id}>
                {formatDocumentType(document.documentType)}: {document.file.originalName}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DemoShell>
  );
}
