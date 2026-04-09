'use client';

import { useEffect, useState } from 'react';

export type DemoUserKey = 'demo-player' | 'demo-partner' | 'demo-admin' | 'review-partner';

export type SessionUserRole = 'player' | 'partner' | 'admin' | 'superadmin';

export type SessionUser = {
  id: string;
  phone: string;
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
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
    setSession(readSession());
    setIsLoaded(true);
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
