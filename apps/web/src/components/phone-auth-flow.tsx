'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { DemoSession, useDemoSession } from '../lib/session';
import { Card, Notice } from './ui';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type RequestCodeResponse = {
  challengeId: string;
  phone: string;
  expiresAt: string;
  delivery: string;
  code?: string;
};

type ScenarioMode = 'player' | 'partner';

type UserAccount = NonNullable<DemoSession['user']>;

type ProfilePresence = {
  id: string;
};

function normalizePhoneInput(phone: string) {
  return phone.trim();
}

function getAuthError(fallback: string, message?: string | null) {
  if (!message) {
    return fallback;
  }

  if (/failed to fetch/i.test(message)) {
    return 'Сервер недоступен. Проверьте API и повторите действие.';
  }

  return message;
}

export function PhoneAuthFlow({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { setSession } = useDemoSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<RequestCodeResponse | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionFromTokens = (nextTokens: AuthTokens, nextUser?: UserAccount | null): DemoSession => ({
    accessToken: nextTokens.accessToken,
    refreshToken: nextTokens.refreshToken,
    user: nextUser ?? undefined,
  });

  const loadMe = async (nextTokens: AuthTokens) => {
    const response = await apiRequest<UserAccount>('/auth/me', {
      method: 'GET',
      session: sessionFromTokens(nextTokens),
    });

    if (!response.success || !response.data) {
      throw new Error(
        getAuthError('Вход выполнен, но профиль аккаунта не загрузился.', response.error?.message),
      );
    }

    return response.data;
  };

  const requestCode = async () => {
    const nextPhone = normalizePhoneInput(phone);

    if (!nextPhone) {
      setError('Укажите телефон, чтобы получить код.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<RequestCodeResponse>('/auth/phone/request-code', {
      method: 'POST',
      body: JSON.stringify({ phone: nextPhone }),
    });

    if (!response.success || !response.data) {
      setError(getAuthError('Не удалось отправить код.', response.error?.message));
      setLoading(false);
      return;
    }

    setPhone(response.data.phone);
    setChallenge(response.data);
    setMessage(
      response.data.code ? `Код для проверки: ${response.data.code}` : 'Код отправлен. Введите его ниже.',
    );
    setLoading(false);
  };

  const verifyCode = async () => {
    if (!challenge) {
      setError('Сначала получите код.');
      return;
    }

    if (!code.trim()) {
      setError('Введите код из сообщения.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<AuthTokens>('/auth/phone/verify-code', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        challengeId: challenge.challengeId,
        code: code.trim(),
      }),
    });

    if (!response.success || !response.data) {
      setError(getAuthError('Не удалось подтвердить код.', response.error?.message));
      setLoading(false);
      return;
    }

    try {
      const nextUser = await loadMe(response.data);
      const nextSession = sessionFromTokens(response.data, nextUser);
      setTokens(response.data);
      setUser(nextUser);
      setSession(nextSession);

      if (mode === 'login') {
        await redirectAfterLogin(nextSession);
        return;
      }

      setMessage('Телефон подтверждён. Выберите, как хотите начать в RAQET.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Не удалось завершить вход.');
    } finally {
      setLoading(false);
    }
  };

  const redirectAfterLogin = async (session: DemoSession) => {
    const [playerProfileResponse, partnerProfileResponse] = await Promise.all([
      apiRequest<ProfilePresence | null>('/player/profile/me', { session }),
      apiRequest<ProfilePresence | null>('/partner/profile/me', { session }),
    ]);

    if (partnerProfileResponse.success && partnerProfileResponse.data) {
      router.push('/me/partner');
      return;
    }

    if (playerProfileResponse.success && playerProfileResponse.data) {
      router.push('/booking-requests');
      return;
    }

    router.push('/onboarding');
  };

  const chooseScenario = async (scenario: ScenarioMode) => {
    if (!tokens || !user) {
      setError('Сначала подтвердите телефон.');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const currentSession = sessionFromTokens(tokens, user);
    const response = await apiRequest<UserAccount>('/user/onboarding/role', {
      method: 'POST',
      session: currentSession,
      body: JSON.stringify({ mode: scenario }),
    });

    if (!response.success || !response.data) {
      setError(getAuthError('Не удалось сохранить выбранный путь.', response.error?.message));
      setLoading(false);
      return;
    }

    setSession(sessionFromTokens(tokens, response.data));
    router.push(scenario === 'player' ? '/me/player' : '/me/partner');
  };

  return (
    <>
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card>
        <h3>{mode === 'register' ? 'Телефон для старта' : 'Вход по телефону'}</h3>
        <div className="form-stack">
          <label className="field">
            <span>Телефон</span>
            <input
              value={phone}
              placeholder="+7 999 123-45-67"
              onChange={(event) => setPhone(event.target.value)}
              disabled={loading || Boolean(tokens)}
              inputMode="tel"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={requestCode}
            disabled={loading || Boolean(tokens)}
          >
            {loading && !challenge ? 'Отправляем...' : 'Получить код'}
          </button>
        </div>
      </Card>

      <Card>
        <h3>Код подтверждения</h3>
        <div className="form-stack">
          <label className="field">
            <span>Код</span>
            <input
              value={code}
              placeholder="1234"
              onChange={(event) => setCode(event.target.value)}
              disabled={loading || !challenge || Boolean(tokens)}
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={verifyCode}
            disabled={loading || !challenge || Boolean(tokens)}
          >
            {loading && challenge
              ? 'Проверяем...'
              : mode === 'register'
                ? 'Подтвердить телефон'
                : 'Войти'}
          </button>
        </div>
      </Card>

      {mode === 'register' && tokens ? (
        <Card accent>
          <h3>Выберите свой путь</h3>
          <p className="muted">
            Начните как игрок, чтобы искать матчи и корты, или как клуб, чтобы принимать заявки от
            сообщества RAQET.
          </p>
          <div className="choice-grid">
            <button
              type="button"
              className="secondary-button choice-action"
              onClick={() => chooseScenario('player')}
              disabled={loading}
            >
              Я игрок
            </button>
            <button
              type="button"
              className="secondary-button choice-action"
              onClick={() => chooseScenario('partner')}
              disabled={loading}
            >
              Я представляю клуб
            </button>
          </div>
        </Card>
      ) : null}
    </>
  );
}
