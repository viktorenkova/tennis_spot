import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../src/components/ui';

const roleCards = [
  {
    title: 'Игрок',
    copy: 'Заполняет анкету, указывает уровень игры и позже сможет искать корты и соперников.',
    href: '/me/player',
  },
  {
    title: 'Партнер',
    copy: 'Заполняет профиль клуба или организации и отправляет заявку на верификацию.',
    href: '/me/partner',
  },
  {
    title: 'Администратор',
    copy: 'Просматривает заявку, изучает документы и принимает решение по верификации.',
    href: '/admin/verification-requests',
  },
];

const steps = [
  'Войдите как игрок, партнер или администратор.',
  'Заполните профиль игрока или партнера.',
  'Отправьте заявку на верификацию партнера.',
  'Откройте аккаунт администратора.',
  'Проверьте заявку и измените ее статус.',
];

const flowLinks = [
  { href: '/demo/auth', title: 'Вход в демо', copy: 'Выберите один из подготовленных аккаунтов.' },
  {
    href: '/me/player',
    title: 'Профиль игрока',
    copy: 'Заполните анкету игрока и укажите свой уровень игры.',
  },
  {
    href: '/me/partner',
    title: 'Профиль партнера',
    copy: 'Укажите основные сведения о клубе или организации.',
  },
  {
    href: '/me/partner/verification',
    title: 'Верификация',
    copy: 'Добавьте документ и отправьте заявку на проверку.',
  },
  {
    href: '/admin/verification-requests',
    title: 'Очередь модерации',
    copy: 'Откройте заявку и примите решение как администратор.',
  },
];

export default function HomePage() {
  return (
    <DemoShell
      title="Первый рабочий сценарий MVP"
      description="Это обзорный демо-срез продукта: вход, анкеты, заявка на верификацию партнера и решение администратора."
    >
      <div className="split-grid">
        <Card accent>
          <h3>Что можно проверить прямо сейчас</h3>
          <div className="info-list">
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Авторизация через demo-аккаунты
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Профиль игрока и партнера
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Заявка на верификацию
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Решение администратора и аудит
            </p>
          </div>
        </Card>

        <Card>
          <h3>Как пройти демо</h3>
          <ol className="ordered-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Notice title="Быстрый способ проверить модерацию">
        В seed уже есть аккаунт <strong>review-partner</strong> с отправленной заявкой. Можно
        сразу войти как <strong>demo-admin</strong> и открыть очередь заявок.
      </Notice>

      <div className="demo-grid">
        {roleCards.map((roleCard) => (
          <Card key={roleCard.title}>
            <h3>{roleCard.title}</h3>
            <p className="muted">{roleCard.copy}</p>
            <Link href={roleCard.href} className="inline-link">
              Открыть сценарий
            </Link>
          </Card>
        ))}
      </div>

      <Card>
        <h3>Быстрые переходы</h3>
        <div className="demo-grid">
          {flowLinks.map((flow) => (
            <Link key={flow.href} href={flow.href} className="feature-link">
              <span className="feature-title">{flow.title}</span>
              <span className="feature-copy">{flow.copy}</span>
            </Link>
          ))}
        </div>
      </Card>
    </DemoShell>
  );
}
