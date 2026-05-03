import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice } from '../src/components/ui';

export default function HomePage() {
  return (
    <DemoShell
      title="Tennis Spot"
      description="Платформа для теннисистов и площадок: игроки ищут корты и партнёров, клубы и школы принимают заявки после проверки."
    >
      <section className="public-hero-actions">
        <Link href="/auth/register" className="primary-button">
          Зарегистрироваться
        </Link>
        <Link href="/auth/login" className="secondary-button">
          Войти
        </Link>
      </section>

      <div className="split-grid">
        <Card accent>
          <h3>Для игроков</h3>
          <p className="muted">
            Создайте аккаунт, заполните профиль, ищите корты и игроков, отправляйте
            заявки на бронирование и вызовы на игру.
          </p>
          <Link href="/auth/register" className="inline-link">
            Начать как игрок
          </Link>
        </Card>

        <Card>
          <h3>Для клубов, школ и организаторов</h3>
          <p className="muted">
            Заполните профиль партнёра, добавьте документы и отправьте заявку на
            проверку. До верификации площадки не попадают в публичный каталог.
          </p>
          <Link href="/auth/register" className="inline-link">
            Начать как партнёр
          </Link>
        </Card>
      </div>

      <Notice title="Как работает проверка партнёра">
        Администратор проверит данные и откроет доступ к публичному каталогу. До
        подтверждения площадки партнёра не участвуют в booking discovery.
      </Notice>

      <p className="helper-copy">
        Для smoke/debug остаётся{' '}
        <Link href="/demo/auth" className="inline-link">
          демо-режим для проверки сценариев
        </Link>
        .
      </p>
    </DemoShell>
  );
}
