'use client';

import { ReactNode } from 'react';

export function Card({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <section className={`card${accent ? ' card-accent' : ''}`}>{children}</section>;
}

export function Notice({
  kind = 'neutral',
  title,
  children,
}: {
  kind?: 'neutral' | 'success' | 'error';
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
