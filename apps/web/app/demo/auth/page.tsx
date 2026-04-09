'use client';

import { useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { DemoSession, DemoUserKey, useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice } from '../../../src/components/ui';

const demoUsers: Array<{ key: DemoUserKey; label: string; copy: string }> = [
  {
    key: 'demo-player',
    label: 'demo-player',
    copy: 'Clean player account for creating a player profile from scratch.',
  },
  {
    key: 'demo-partner',
    label: 'demo-partner',
    copy: 'Clean partner account for creating a partner profile and submitting verification.',
  },
  {
    key: 'demo-admin',
    label: 'demo-admin',
    copy: 'Admin account for the verification moderation queue.',
  },
  {
    key: 'review-partner',
    label: 'review-partner',
    copy: 'Seeded partner with a ready-to-review verification request.',
  },
];

type DemoLoginResponse = {
  accessToken: string;
  refreshToken: string;
  demoUser: {
    key: DemoUserKey;
  };
};

export default function DemoAuthPage() {
  const { session, setSession } = useDemoSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<DemoUserKey | null>(null);

  const handleLogin = async (userKey: DemoUserKey) => {
    setLoadingKey(userKey);
    setMessage(null);
    setError(null);

    const loginResponse = await apiRequest<DemoLoginResponse>('/auth/demo/login', {
      method: 'POST',
      body: JSON.stringify({ userKey }),
    });

    if (!loginResponse.success || !loginResponse.data) {
      setError(loginResponse.error?.message ?? 'Demo login failed.');
      setLoadingKey(null);
      return;
    }

    const nextSession: DemoSession = {
      accessToken: loginResponse.data.accessToken,
      refreshToken: loginResponse.data.refreshToken,
      userKey,
    };

    const meResponse = await apiRequest('/auth/me', {
      method: 'GET',
      session: nextSession,
    });

    if (!meResponse.success || !meResponse.data) {
      setError(meResponse.error?.message ?? 'Signed in, but failed to load current user.');
      setLoadingKey(null);
      return;
    }

    setSession({
      ...nextSession,
      user: meResponse.data as DemoSession['user'],
    });
    setMessage(`Signed in as ${userKey}.`);
    setLoadingKey(null);
  };

  return (
    <DemoShell
      title="Demo auth"
      description="Development-only sign-in for the seeded demo accounts. This does not replace the phone-first auth design, it only accelerates local review."
    >
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="demo-grid">
        {demoUsers.map((demoUser) => (
          <Card key={demoUser.key} accent={session?.userKey === demoUser.key}>
            <h3>{demoUser.label}</h3>
            <p className="muted">{demoUser.copy}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleLogin(demoUser.key)}
              disabled={loadingKey === demoUser.key}
            >
              {loadingKey === demoUser.key ? 'Signing in...' : `Sign in as ${demoUser.label}`}
            </button>
          </Card>
        ))}
      </div>
    </DemoShell>
  );
}
