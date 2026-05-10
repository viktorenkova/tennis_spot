'use client';

import { useEffect, useState } from 'react';

export type DemoUserKey = 'demo-player' | 'demo-partner' | 'demo-admin' | 'review-partner';

export type SessionUserRole = 'player' | 'partner' | 'admin' | 'superadmin';

export type SessionUser = {
  id: string;
  phone: string;
  email?: string | null;
  status: string;
  roles: Array<{
    role: {
      key: SessionUserRole;
      name: string;
    };
  }>;
};

export type DemoSession = {
  accessToken: string;
  refreshToken: string;
  userKey?: DemoUserKey;
  user?: SessionUser;
};

const STORAGE_KEY = 'tennis_spot.demo_session';
const SESSION_CHANGED_EVENT = 'tennis_spot.session_changed';

export function readSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DemoSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeSession(session: DemoSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function hasRole(session: DemoSession | null, role: SessionUserRole) {
  if (!session?.user) {
    return false;
  }

  return session.user.roles.some(({ role: currentRole }) => currentRole.key === role);
}

export function useDemoSession() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const syncSession = () => {
      setSession(readSession());
    };

    syncSession();
    setIsLoaded(true);

    window.addEventListener('storage', syncSession);
    window.addEventListener(SESSION_CHANGED_EVENT, syncSession);

    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener(SESSION_CHANGED_EVENT, syncSession);
    };
  }, []);

  const updateSession = (nextSession: DemoSession | null) => {
    writeSession(nextSession);
    setSession(nextSession);
  };

  return {
    session,
    isLoaded,
    setSession: updateSession,
    clearSession: () => updateSession(null),
  };
}
