'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DemoShell } from '../../src/components/demo-shell';
import { Card, Notice } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import { DemoSession, useDemoSession } from '../../src/lib/session';

type ScenarioMode = 'player' | 'partner';
type UserAccount = NonNullable<DemoSession['user']>;

export default function OnboardingPage() {
  const router = useRouter();
  const { session, isLoaded, setSession } = useDemoSession();
  const [loadingMode, setLoadingMode] = useState<ScenarioMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseScenario = async (mode: ScenarioMode) => {
    if (!session) {
      router.push('/auth/login');
      return;
    }

    setLoadingMode(mode);
    setError(null);

    const response = await apiRequest<UserAccount>('/user/onboarding/role', {
      method: 'POST',
      session,
      body: JSON.stringify({ mode }),
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Не удалось сохранить выбранный сценарий.');
      setLoadingMode(null);
      return;
    }

    setSession({
      ...session,
      user: response.data,
    });
    router.push(mode === 'player' ? '/me/player' : '/me/partner');
  };

  return (
    <DemoShell
      title="Выберите сценарий"
      description="Расскажите, как вы хотите начать работу в Tennis Spot. Это можно расширить позже, но сейчас выберите первый основной путь."
    >
      {!isLoaded ? <Notice>Проверяем текущий вход...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите или зарегистрируйтесь по телефону.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <h3>Продолжить как игрок</h3>
          <p className="muted">
            Заполните профиль игрока, чтобы искать корты, других игроков и отправлять
            заявки на бронирование.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => chooseScenario('player')}
            disabled={!session || Boolean(loadingMode)}
          >
            {loadingMode === 'player' ? 'Сохраняем...' : 'Я игрок'}
          </button>
        </Card>

        <Card>
          <h3>Продолжить как партнёр</h3>
          <p className="muted">
            Заполните профиль клуба, школы или организатора. После документов
            администратор проверит данные и откроет доступ к публичному каталогу.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => chooseScenario('partner')}
            disabled={!session || Boolean(loadingMode)}
          >
            {loadingMode === 'partner' ? 'Сохраняем...' : 'Я партнёр'}
          </button>
        </Card>
      </div>
    </DemoShell>
  );
}
