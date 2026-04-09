'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
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
      setError(response.error?.message ?? 'Failed to load verification queue.');
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
      title="Admin verification queue"
      description="Admin-only list of submitted verification requests with filtering and direct links into the review screen."
    >
      {!isLoaded ? <Notice>Loading session...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Sign in as `demo-admin` before opening the admin queue.</Notice>
      ) : null}
      {session && !canUseAdminFlow ? (
        <Notice kind="error">This page is restricted to admin and superadmin roles.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card>
        <h3>Queue filters</h3>
        <label className="field">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            <option value="submitted">submitted</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="needs_correction">needs_correction</option>
          </select>
        </label>
      </Card>

      <Card>
        <h3>Verification requests</h3>
        {loading ? <p className="muted">Loading queue...</p> : null}
        {!loading && items.length === 0 ? (
          <p className="muted">No verification requests found for the current filter.</p>
        ) : null}

        <div className="list-stack">
          {items.map((item) => (
            <Link key={item.id} href={`/admin/verification-requests/${item.id}`} className="list-row">
              <span>
                <strong>{item.partnerProfile.brandName ?? item.partnerProfile.legalName}</strong>
                <br />
                <span className="muted">{item.partnerProfile.ownerUser.phone}</span>
              </span>
              <span>{item.status}</span>
            </Link>
          ))}
        </div>
      </Card>
    </DemoShell>
  );
}
