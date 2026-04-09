'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { hasRole, useDemoSession } from '../lib/session';

const baseLinks = [
  { href: '/', label: 'Home' },
  { href: '/demo/auth', label: 'Demo auth' },
  { href: '/me/player', label: 'My player profile' },
  { href: '/me/partner', label: 'My partner profile' },
  { href: '/me/partner/verification', label: 'Partner verification' },
];

const adminLinks = [
  { href: '/admin/verification-requests', label: 'Admin verification queue' },
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
          <h1 className="brand-title">P1 Week 1 review slice</h1>
          <p className="brand-copy">
            Auth, player profile, partner profile, verification submission and admin review in one
            browser-checkable loop.
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
          <h2>Session</h2>
          {!isLoaded ? <p className="muted">Loading session...</p> : null}
          {isLoaded && !session ? (
            <p className="muted">No active demo session. Use the demo auth page to sign in.</p>
          ) : null}
          {session?.user ? (
            <>
              <p className="session-line">
                <strong>Phone:</strong> {session.user.phone}
              </p>
              <p className="session-line">
                <strong>Roles:</strong>{' '}
                {session.user.roles.map(({ role }) => role.key).join(', ') || 'none'}
              </p>
              {session.userKey ? (
                <p className="session-line">
                  <strong>Demo key:</strong> {session.userKey}
                </p>
              ) : null}
              <button type="button" className="ghost-button" onClick={clearSession}>
                Sign out
              </button>
            </>
          ) : null}
        </section>
      </aside>

      <section className="content-panel">
        <header className="page-header">
          <p className="eyebrow">Review flow</p>
          <h2>{title}</h2>
          <p className="page-copy">{description}</p>
        </header>

        <section className="page-content">{children}</section>
      </section>
    </main>
  );
}
