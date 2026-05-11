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
      setError(response.error?.message ?? 'Не удалось сохранить выбранный путь.');
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
      title="Выберите свой путь"
      description="RAQET подстраивает первый экран под вашу роль: игрок ищет матчи и корты, клуб управляет площадками и заявками."
    >
      {!isLoaded ? <Notice>Проверяем вход...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Сначала войдите или присоединитесь по телефону.</Notice>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <div className="split-grid">
        <Card accent>
          <h3>Играть в RAQET</h3>
          <p className="muted">
            Создайте профиль игрока, находите соперников рядом, выбирайте корты и собирайте
            следующий матч без лишней суеты.
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
          <h3>Развивать клуб</h3>
          <p className="muted">
            Добавьте профиль клуба, площадки, корты и расписание, чтобы принимать заявки от
            современного теннисного сообщества.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => chooseScenario('partner')}
            disabled={!session || Boolean(loadingMode)}
          >
            {loadingMode === 'partner' ? 'Сохраняем...' : 'Я представляю клуб'}
          </button>
        </Card>
      </div>
    </DemoShell>
  );
}
