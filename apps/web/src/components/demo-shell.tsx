'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';
import { formatRole } from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';

type NavigationItem = {
  href: string;
  label: string;
  roles?: Array<'player' | 'partner' | 'admin' | 'superadmin'>;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

type HealthResponse = {
  status: string;
};

const publicNavigation: NavigationSection[] = [
  {
    title: 'Аккаунт',
    items: [
      { href: '/', label: 'Главная' },
      { href: '/auth/register', label: 'Зарегистрироваться' },
      { href: '/auth/login', label: 'Войти' },
    ],
  },
];

const productNavigation: NavigationSection[] = [
  {
    title: 'Игрок',
    items: [
      { href: '/booking-requests', label: 'Забронировать корт', roles: ['player'] },
      { href: '/players', label: 'Игроки', roles: ['player'] },
      { href: '/match-requests', label: 'Вызовы', roles: ['player'] },
      { href: '/me/player', label: 'Профиль игрока', roles: ['player'] },
      { href: '/complaints', label: 'Жалобы', roles: ['player', 'partner'] },
      { href: '/notifications', label: 'Уведомления', roles: ['player', 'partner', 'admin', 'superadmin'] },
    ],
  },
  {
    title: 'Партнёр',
    items: [
      { href: '/me/partner', label: 'Кабинет партнёра', roles: ['partner'] },
      { href: '/me/partner/venues', label: 'Мои площадки', roles: ['partner'] },
      { href: '/me/partner/verification', label: 'Верификация', roles: ['partner'] },
      { href: '/me/partner/booking-requests', label: 'Входящие заявки', roles: ['partner'] },
    ],
  },
  {
    title: 'Администрирование',
    items: [
      { href: '/admin/verification-requests', label: 'Верификация партнёров', roles: ['admin', 'superadmin'] },
      { href: '/admin/complaints', label: 'Жалобы', roles: ['admin', 'superadmin'] },
    ],
  },
];

const qaNavigation: NavigationSection[] = [
  {
    title: 'QA',
    items: [{ href: '/demo/auth', label: 'Сценарии проверки' }],
  },
];

function userHasNavigationRole(
  session: ReturnType<typeof useDemoSession>['session'],
  roles?: NavigationItem['roles'],
) {
  if (!roles?.length) {
    return true;
  }

  return roles.some((role) => hasRole(session, role));
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavigationSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="side-nav" aria-label="Основная навигация">
      {sections.map((section) => (
        <section key={section.title} className="nav-section">
          <p className="nav-section-title">{section.title}</p>
          <div className="nav-section-links">
            {section.items.map((link) => {
              const active = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link${active ? ' nav-link-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function DemoShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { session, clearSession, isLoaded } = useDemoSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const isQaRoute = pathname.startsWith('/demo');

  const sections = useMemo(() => {
    const baseSections = session
      ? productNavigation
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => userHasNavigationRole(session, item.roles)),
          }))
          .filter((section) => section.items.length > 0)
      : publicNavigation;

    return isQaRoute ? [...baseSections, ...qaNavigation] : baseSections;
  }, [isQaRoute, session]);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      setApiStatus('checking');
      const response = await apiRequest<HealthResponse>('/health', { timeoutMs: 2500 });

      if (!isMounted) {
        return;
      }

      setApiStatus(response.success && response.data?.status === 'ok' ? 'online' : 'offline');
    }

    void checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const sessionLabel = session?.user
    ? session.user.roles.map(({ role }) => formatRole(role.key)).join(', ')
    : 'Гость';

  return (
    <main className="app-shell">
      <header className="mobile-topbar">
        <Link href="/" className="mobile-brand" onClick={() => setMenuOpen(false)}>
          Tennis Spot
        </Link>
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          {menuOpen ? 'Закрыть' : 'Меню'}
        </button>
      </header>

      {menuOpen ? (
        <div className="mobile-drawer" id="mobile-navigation">
          <NavigationLinks
            sections={sections}
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
      ) : null}

      <aside className="side-panel">
        <div className="brand-block">
          <p className="eyebrow">tennis_spot</p>
          <h1 className="brand-title">Tennis Spot</h1>
          <p className="brand-copy">
            Сервис для игроков и площадок: поиск кортов, заявки на бронь, профили игроков,
            верификация партнёров и управление расписанием.
          </p>
        </div>

        <NavigationLinks sections={sections} pathname={pathname} />

        <section className="session-card">
          <div className="session-card-header">
            <h2>Сессия</h2>
            <span className={`api-status api-status-${apiStatus}`}>
              {apiStatus === 'online'
                ? 'API работает'
                : apiStatus === 'offline'
                  ? 'API недоступен'
                  : 'Проверяем API'}
            </span>
          </div>
          {!isLoaded ? <p className="muted">Проверяем текущий вход...</p> : null}
          {isLoaded && !session ? (
            <p className="muted">Войдите или зарегистрируйтесь, чтобы продолжить.</p>
          ) : null}
          {session?.user ? (
            <>
              <p className="session-line">
                <strong>Телефон:</strong> {session.user.phone}
              </p>
              <p className="session-line">
                <strong>Роль:</strong> {sessionLabel || 'Не указана'}
              </p>
              <button type="button" className="ghost-button" onClick={clearSession}>
                Выйти
              </button>
            </>
          ) : null}
        </section>
      </aside>

      <section className="content-panel">
        <header className="page-header">
          <p className="eyebrow">tennis_spot</p>
          <h2>{title}</h2>
          <p className="page-copy">{description}</p>
        </header>

        <section className="page-content">{children}</section>
      </section>
    </main>
  );
}
