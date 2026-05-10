import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice } from '../src/components/ui';

export default function HomePage() {
  return (
    <DemoShell
      title="Tennis Spot"
      description="Найдите корт, соперника или разместите площадку для игроков вашего города."
    >
      <section className="public-hero-actions">
        <Link href="/booking-requests" className="primary-button">
          Найти корт
        </Link>
        <Link href="/players" className="secondary-button">
          Найти партнёра
        </Link>
        <Link href="/auth/register" className="secondary-button">
          Разместить площадку
        </Link>
      </section>

      <div className="split-grid">
        <Card accent>
          <h3>Игрокам</h3>
          <p className="muted">
            Подберите корт по дате, времени и району, отправьте заявку на бронь и найдите
            соперника для игры.
          </p>
          <Link href="/booking-requests" className="inline-link">
            Перейти к поиску корта
          </Link>
        </Card>

        <Card>
          <h3>Клубам, школам и организаторам</h3>
          <p className="muted">
            Добавьте профиль, площадки, корты и расписание, чтобы получать заявки от игроков.
          </p>
          <Link href="/auth/register" className="inline-link">
            Начать как партнёр
          </Link>
        </Card>
      </div>

      <Notice title="Как работает проверка партнёра">
        После заполнения профиля партнёр отправляет документы на проверку. После подтверждения
        площадки появляются в публичном каталоге и становятся доступны для заявок.
      </Notice>
    </DemoShell>
  );
}
