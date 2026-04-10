'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { formatRole } from '../lib/labels';
import { hasRole, useDemoSession } from '../lib/session';

const baseLinks = [
  { href: '/', label: 'Главная' },
  { href: '/demo/auth', label: 'Демо-вход' },
  { href: '/me/player', label: 'Мой профиль игрока' },
  { href: '/me/partner', label: 'Мой профиль партнера' },
  { href: '/me/partner/verification', label: 'Верификация партнера' },
];

const adminLinks = [
  { href: '/admin/verification-requests', label: 'Очередь заявок на верификацию' },
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
  const links = hasRole(session, 'admin') || hasRole(session, 'superadmin')
    ? [...baseLinks, ...adminLinks]
    : baseLinks;

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand-block">
          <p className="eyebrow">tennis_spot</p>
          <h1 className="brand-title">P1 Week 1: обзорный MVP-срез</h1>
          <p className="brand-copy">
            Авторизация, профиль игрока, профиль партнера, отправка верификации и модерация
            администратором в одном демонстрационном цикле.
          </p>
        </div>

        <nav className="side-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <section className="session-card">
          <h2>Сессия</h2>
          {!isLoaded ? <p className="muted">Загрузка сессии...</p> : null}
          {isLoaded && !session ? (
            <p className="muted">Активной демо-сессии нет. Войдите через страницу демо-входа.</p>
          ) : null}
          {session?.user ? (
            <>
              <p className="session-line">
                <strong>Телефон:</strong> {session.user.phone}
              </p>
              <p className="session-line">
                <strong>Роли:</strong>{' '}
                {session.user.roles.map(({ role }) => formatRole(role.key)).join(', ') || 'нет'}
              </p>
              {session.userKey ? (
                <p className="session-line">
                  <strong>Демо-ключ:</strong> {session.userKey}
                </p>
              ) : null}
              <button type="button" className="ghost-button" onClick={clearSession}>
                Выйти
              </button>
            </>
          ) : null}
        </section>
      </aside>

      <section className="content-panel">
        <header className="page-header">
          <p className="eyebrow">Демо-поток</p>
          <h2>{title}</h2>
          <p className="page-copy">{description}</p>
        </header>

        <section className="page-content">{children}</section>
      </section>
    </main>
  );
}
