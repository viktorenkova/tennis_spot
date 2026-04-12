'use client';

import { useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { DemoSession, DemoUserKey, useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../../../src/components/ui';

const demoUsers: Array<{ key: DemoUserKey; title: string; copy: string }> = [
  {
    key: 'demo-player',
    title: 'Игрок',
    copy: 'Подходит для проверки анкеты игрока и заполнения данных с нуля.',
  },
  {
    key: 'demo-partner',
    title: 'Партнер',
    copy: 'Подходит для заполнения профиля партнера и отправки заявки на верификацию.',
  },
  {
    key: 'demo-admin',
    title: 'Администратор',
    copy: 'Подходит для проверки очереди заявок и принятия решения по верификации.',
  },
  {
    key: 'review-partner',
    title: 'Партнер с готовой заявкой',
    copy: 'В аккаунте уже есть заполненные данные и отправленная заявка на проверку.',
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
      setError(loginResponse.error?.message ?? 'Не удалось войти в демо-аккаунт.');
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
      setError(
        meResponse.error?.message ?? 'Вход выполнен, но не удалось загрузить данные аккаунта.',
      );
      setLoadingKey(null);
      return;
    }

    setSession({
      ...nextSession,
      user: meResponse.data as DemoSession['user'],
    });
    setMessage('Аккаунт выбран. Можно переходить к следующему шагу.');
    setLoadingKey(null);
  };

  return (
    <DemoShell
      title="Вход в демо"
      description="Выберите один из подготовленных аккаунтов, чтобы быстро пройти нужный сценарий: игрок, партнер или администратор."
    >
      <Notice title="Как пользоваться этой страницей">
        Сначала выберите аккаунт, затем переходите в соответствующий раздел через левую навигацию.
      </Notice>

      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="demo-grid">
        {demoUsers.map((demoUser) => (
          <Card key={demoUser.key} accent={session?.userKey === demoUser.key}>
            <div className="card-header-row">
              <h3>{demoUser.title}</h3>
              {session?.userKey === demoUser.key ? <StatusBadge tone="success">Выбран</StatusBadge> : null}
            </div>
            <p className="muted">{demoUser.copy}</p>
            <p className="helper-copy">Аккаунт: {demoUser.key}</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleLogin(demoUser.key)}
              disabled={loadingKey === demoUser.key}
            >
              {loadingKey === demoUser.key ? 'Выполняем вход...' : 'Войти в этот аккаунт'}
            </button>
          </Card>
        ))}
      </div>
    </DemoShell>
  );
}
