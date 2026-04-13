'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { formatRole } from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';

const navigation = [
  {
    title: 'Обзор',
    items: [
      { href: '/', label: 'Главная' },
      { href: '/demo/auth', label: 'Вход в демо' },
    ],
  },
  {
    title: 'Сценарий игрока',
    items: [
      { href: '/me/player', label: 'Профиль игрока' },
      { href: '/booking-requests', label: 'Заявки на бронь' },
    ],
  },
  {
    title: 'Сценарий партнёра',
    items: [
      { href: '/me/partner', label: 'Профиль партнёра' },
      { href: '/me/partner/venues', label: 'Площадки и корты' },
      { href: '/me/partner/verification', label: 'Верификация партнёра' },
      { href: '/me/partner/booking-requests', label: 'Входящие заявки' },
    ],
  },
  {
    title: 'Сценарий администратора',
    adminOnly: true,
    items: [{ href: '/admin/verification-requests', label: 'Заявки на верификацию' }],
  },
];

export function DemoShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { session, clearSession, isLoaded } = useDemoSession();
  const isAdmin = hasRole(session, 'admin') || hasRole(session, 'superadmin');
  const sections = navigation.filter((section) => !section.adminOnly || isAdmin);

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand-block">
          <p className="eyebrow">tennis_spot</p>
          <h1 className="brand-title">Демо-срез MVP</h1>
          <p className="brand-copy">
            Рабочий сценарий для проверки профилей, площадок, верификации партнёра и заявок на бронь.
          </p>
        </div>

        <nav className="side-nav">
          {sections.map((section) => (
            <section key={section.title} className="nav-section">
              <p className="nav-section-title">{section.title}</p>
              <div className="nav-section-links">
                {section.items.map((link) => (
                  <Link key={link.href} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <section className="session-card">
          <div className="session-card-header">
            <h2>Текущая сессия</h2>
            {session?.userKey ? <span className="session-badge">{session.userKey}</span> : null}
          </div>
          {!isLoaded ? <p className="muted">Проверяем текущий вход...</p> : null}
          {isLoaded && !session ? (
            <p className="muted">
              Аккаунт не выбран. Сначала откройте страницу демо-входа и авторизуйтесь.
            </p>
          ) : null}
          {session?.user ? (
            <>
              <p className="session-line">
                <strong>Телефон:</strong> {session.user.phone}
              </p>
              <p className="session-line">
                <strong>Роли:</strong>{' '}
                {session.user.roles.map(({ role }) => formatRole(role.key)).join(', ') ||
                  'Не указаны'}
              </p>
              <button type="button" className="ghost-button" onClick={clearSession}>
                Выйти из аккаунта
              </button>
            </>
          ) : null}
        </section>
      </aside>

      <section className="content-panel">
        <header className="page-header">
          <p className="eyebrow">Рабочий поток</p>
          <h2>{title}</h2>
          <p className="page-copy">{description}</p>
        </header>

        <section className="page-content">{children}</section>
      </section>
    </main>
  );
}
