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
    copy: 'Чистый аккаунт игрока для создания профиля с нуля.',
  },
  {
    key: 'demo-partner',
    label: 'demo-partner',
    copy: 'Чистый аккаунт партнера для создания профиля и отправки верификации.',
  },
  {
    key: 'demo-admin',
    label: 'demo-admin',
    copy: 'Аккаунт администратора для модерации заявок на верификацию.',
  },
  {
    key: 'review-partner',
    label: 'review-partner',
    copy: 'Партнер из seed с уже готовой к проверке заявкой.',
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
      setError(loginResponse.error?.message ?? 'Не удалось выполнить демо-вход.');
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
      setError(meResponse.error?.message ?? 'Вход выполнен, но не удалось загрузить текущего пользователя.');
      setLoadingKey(null);
      return;
    }

    setSession({
      ...nextSession,
      user: meResponse.data as DemoSession['user'],
    });
    setMessage(`Вход выполнен как ${userKey}.`);
    setLoadingKey(null);
  };

  return (
    <DemoShell
      title="Демо-вход"
      description="Dev-only вход для seed-аккаунтов. Он не заменяет основную phone-first авторизацию, а лишь ускоряет локальный обзор сценариев."
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
              {loadingKey === demoUser.key ? 'Выполняется вход...' : `Войти как ${demoUser.label}`}
            </button>
          </Card>
        ))}
      </div>
    </DemoShell>
  );
}
