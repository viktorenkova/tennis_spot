'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { formatRole } from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';

const publicNavigation = [
  { href: '/', label: 'Главная' },
  { href: '/auth/register', label: 'Зарегистрироваться' },
  { href: '/auth/login', label: 'Войти' },
];

const productNavigation = [
  {
    title: 'Основное',
    items: [
      { href: '/', label: 'Главная' },
      { href: '/booking-requests', label: 'Корты / Бронирование' },
      { href: '/players', label: 'Игроки' },
      { href: '/match-requests', label: 'Вызовы' },
      { href: '/complaints', label: 'Жалобы' },
      { href: '/notifications', label: 'Уведомления' },
    ],
  },
  {
    title: 'Профиль',
    items: [
      { href: '/me/player', label: 'Профиль игрока' },
      { href: '/me/partner', label: 'Профиль партнёра' },
      { href: '/me/partner/venues', label: 'Площадки' },
      { href: '/me/partner/verification', label: 'Верификация партнёра' },
      { href: '/me/partner/booking-requests', label: 'Входящие заявки' },
    ],
  },
  {
    title: 'Администрирование',
    adminOnly: true,
    items: [
      { href: '/admin/verification-requests', label: 'Заявки на верификацию' },
      { href: '/admin/complaints', label: 'Жалобы' },
    ],
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
  const sections = productNavigation.filter((section) => !section.adminOnly || isAdmin);

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand-block">
          <p className="eyebrow">tennis_spot</p>
          <h1 className="brand-title">Tennis Spot</h1>
          <p className="brand-copy">
            Сервис для игроков, клубов, школ и организаторов: профили, корты,
            заявки на бронирование, поиск партнёров и проверка площадок.
          </p>
        </div>

        <nav className="side-nav">
          {!session ? (
            <section className="nav-section">
              <p className="nav-section-title">Аккаунт</p>
              <div className="nav-section-links">
                {publicNavigation.map((link) => (
                  <Link key={link.href} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            sections.map((section) => (
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
            ))
          )}

          <section className="nav-section">
            <p className="nav-section-title">Debug</p>
            <div className="nav-section-links">
              <Link href="/demo/auth" className="nav-link nav-link-subtle">
                Демо-режим для проверки сценариев
              </Link>
            </div>
          </section>
        </nav>

        <section className="session-card">
          <div className="session-card-header">
            <h2>Текущая сессия</h2>
            {session?.userKey ? <span className="session-badge">{session.userKey}</span> : null}
          </div>
          {!isLoaded ? <p className="muted">Проверяем текущий вход...</p> : null}
          {isLoaded && !session ? (
            <p className="muted">
              Вы не вошли. Зарегистрируйтесь или войдите по телефону, чтобы продолжить.
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
