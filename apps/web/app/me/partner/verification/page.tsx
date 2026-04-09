'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../../src/lib/api';
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
      setError(response.error?.message ?? 'Failed to add demo document.');
      setLoading(false);
      return;
    }

    setMessage('Demo verification document added.');
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
      setError(response.error?.message ?? 'Failed to submit verification request.');
      setLoading(false);
      return;
    }

    setMessage('Verification request submitted.');
    setRequest(response.data ?? null);
    setLoading(false);
    await loadData();
  };

  return (
    <DemoShell
      title="Partner verification"
      description="Use this page to inspect current verification state, add a demo document and submit the request into the admin queue."
    >
      {!isLoaded ? <Notice>Loading session...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Sign in on the Demo auth page before opening partner verification.</Notice>
      ) : null}
      {!partnerProfile && session ? (
        <Notice kind="error">Create a partner profile first. The verification request needs a partner profile.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {partnerProfile ? (
        <Card accent>
          <h3>Partner verification state</h3>
          <p className="session-line">
            <strong>Partner:</strong> {partnerProfile.legalName}
          </p>
          <p className="session-line">
            <strong>Partner status:</strong> {partnerProfile.verificationStatus}
          </p>
          <p className="session-line">
            <strong>Latest request:</strong> {request?.status ?? 'No request yet'}
          </p>
        </Card>
      ) : null}

      <div className="split-grid">
        <Card>
          <h3>Add demo document</h3>
          <div className="form-grid">
            <label className="field">
              <span>Document type</span>
              <input
                value={docForm.documentType}
                onChange={(event) =>
                  setDocForm((current) => ({ ...current, documentType: event.target.value }))
                }
                disabled={!session || !partnerProfile}
              />
            </label>

            <label className="field">
              <span>Original name</span>
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
            {loading ? 'Working...' : 'Add demo document'}
          </button>
        </Card>

        <Card>
          <h3>Submit verification</h3>
          <p className="muted">
            Submission keeps the flow intentionally simple for this slice. Documents are optional in
            the demo, but the admin page will display them if you add any.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={submitRequest}
            disabled={!session || !partnerProfile || loading}
          >
            {loading ? 'Submitting...' : 'Submit verification request'}
          </button>
        </Card>
      </div>

      <Card>
        <h3>Current request details</h3>
        {!request ? <p className="muted">No verification request has been created yet.</p> : null}
        {request ? (
          <>
            <p className="session-line">
              <strong>Status:</strong> {request.status}
            </p>
            <p className="session-line">
              <strong>Submitted at:</strong> {request.submittedAt ?? 'Not submitted'}
            </p>
            <p className="session-line">
              <strong>Comment:</strong> {request.comment ?? 'No comment'}
            </p>
            <ul className="bullet-list">
              {request.documents.map((document) => (
                <li key={document.id}>
                  {document.documentType}: {document.file.originalName} ({document.file.mimeType})
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </DemoShell>
  );
}
