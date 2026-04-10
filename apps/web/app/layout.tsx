import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'tennis_spot',
  description: 'B2B2C web MVP для теннисистов, клубов и организаторов турниров.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
