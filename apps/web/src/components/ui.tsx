'use client';

import { ReactNode } from 'react';

export function Card({
  children,
  accent = false,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section className={`card${accent ? ' card-accent' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  );
}

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  return <span className={`status-badge status-badge-${tone}`}>{children}</span>;
}

export function Notice({
  kind = 'neutral',
  title,
  children,
}: {
  kind?: 'neutral' | 'success' | 'error' | 'warning';
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`notice notice-${kind}`}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
