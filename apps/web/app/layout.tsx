import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RAQET',
  description: 'Современное теннисное сообщество: игроки, матчи, корты и клубы в одном месте.',
  icons: {
    icon: '/icons/app-icon.png',
    apple: '/icons/app-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
