import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice } from '../src/components/ui';

const demoFlows = [
  {
    href: '/demo/auth',
    title: 'Демо-вход',
    copy: 'Войдите как demo-player, demo-partner, demo-admin или review-partner.',
  },
  {
    href: '/me/player',
    title: 'Профиль игрока',
    copy: 'Создайте или обновите профиль игрока через живой REST API.',
  },
  {
    href: '/me/partner',
    title: 'Профиль партнера',
    copy: 'Создайте профиль партнера, который затем пойдет на верификацию.',
  },
  {
    href: '/me/partner/verification',
    title: 'Подача на верификацию',
    copy: 'Отправьте заявку на верификацию партнера и проверьте текущий статус.',
  },
  {
    href: '/admin/verification-requests',
    title: 'Очередь модерации',
    copy: 'Проверьте seed-заявки или те, что были созданы в текущей демо-сессии.',
  },
];

export default function HomePage() {
  return (
    <DemoShell
      title="Обзорный MVP-срез"
      description="Эта итерация закрывает один реальный бизнес-цикл целиком: авторизация, профили, отправка верификации и модерация администратором."
    >
      <div className="split-grid">
        <Card accent>
          <h3>Что уже работает</h3>
          <ul className="bullet-list">
            <li>Удобный демо-вход поверх основной JWT-архитектуры авторизации.</li>
            <li>CRUD для профилей игрока и партнера через PostgreSQL/Prisma.</li>
            <li>Подача партнерской верификации и действия модерации только для администратора.</li>
            <li>Реальные записи в аудит-логе для подачи заявки и решений модератора.</li>
          </ul>
        </Card>

        <Card>
          <h3>Как быстро пройти сценарий</h3>
          <ol className="ordered-list">
            <li>Откройте страницу демо-входа и войдите как `demo-partner`.</li>
            <li>Создайте или обновите профиль партнера и отправьте заявку на верификацию.</li>
            <li>Переключитесь на `demo-admin` и откройте очередь модерации.</li>
            <li>Откройте одну заявку и измените ее статус.</li>
          </ol>
        </Card>
      </div>

      <Notice title="Быстрый демонстрационный путь">
        В seed уже создается `review-partner` с отправленной заявкой на верификацию, поэтому
        админский сценарий можно смотреть сразу после локального запуска.
      </Notice>

      <div className="demo-grid">
        {demoFlows.map((flow) => (
          <Link key={flow.href} href={flow.href} className="feature-link">
            <span className="feature-title">{flow.title}</span>
            <span className="feature-copy">{flow.copy}</span>
          </Link>
        ))}
      </div>
    </DemoShell>
  );
}
