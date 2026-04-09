'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
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
  approve: 'Approve',
  reject: 'Reject',
  needsCorrection: 'Needs correction',
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
      setError(response.error?.message ?? 'Failed to load request details.');
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
      setError(response.error?.message ?? `Failed to ${actionLabels[action].toLowerCase()} request.`);
      setLoading(false);
      return;
    }

    setMessage(`${actionLabels[action]} action completed.`);
    setLoading(false);
    await load();
  };

  return (
    <DemoShell
      title="Verification request details"
      description="Admin-only review screen with status, documents, audit log and review actions."
    >
      {!isLoaded ? <Notice>Loading session...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Sign in as `demo-admin` before opening verification details.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">This page is restricted to admin and superadmin roles.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {details ? (
        <>
          <div className="split-grid">
            <Card accent>
              <h3>Request summary</h3>
              <p className="session-line">
                <strong>Status:</strong> {details.status}
              </p>
              <p className="session-line">
                <strong>Partner status:</strong> {details.partnerProfile.verificationStatus}
              </p>
              <p className="session-line">
                <strong>Submitted:</strong> {details.submittedAt ?? 'Not submitted'}
              </p>
              <p className="session-line">
                <strong>Reviewed:</strong> {details.reviewedAt ?? 'Not reviewed yet'}
              </p>
            </Card>

            <Card>
              <h3>Partner profile</h3>
              <p className="session-line">
                <strong>Name:</strong>{' '}
                {details.partnerProfile.brandName ?? details.partnerProfile.legalName}
              </p>
              <p className="session-line">
                <strong>Phone:</strong> {details.partnerProfile.ownerUser.phone}
              </p>
              <p className="session-line">
                <strong>Types:</strong>{' '}
                {details.partnerProfile.profileTypes.map(({ partnerType }) => partnerType.key).join(', ')}
              </p>
              <p className="muted">{details.partnerProfile.description ?? 'No description'}</p>
            </Card>
          </div>

          <Card>
            <h3>Review action</h3>
            <label className="field">
              <span>Review comment</span>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="primary-button"
                onClick={() => runAction('approve')}
                disabled={loading}
              >
                Approve
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => runAction('needsCorrection')}
                disabled={loading}
              >
                Needs correction
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => runAction('reject')}
                disabled={loading}
              >
                Reject
              </button>
            </div>
          </Card>

          <Card>
            <h3>Documents</h3>
            <ul className="bullet-list">
              {details.documents.map((document) => (
                <li key={document.id}>
                  {document.documentType}: {document.file.originalName} ({document.file.storageKey})
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3>Audit trail</h3>
            <ul className="bullet-list">
              {details.auditLogs.map((log) => (
                <li key={log.id}>
                  {log.action} by {log.actorUser?.phone ?? 'system'} at {log.createdAt}
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
