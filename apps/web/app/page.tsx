import Link from 'next/link';
import { DemoShell } from '../src/components/demo-shell';
import { Card, Notice, StatusBadge } from '../src/components/ui';

const roleCards = [
  {
    title: 'Игрок',
    copy: 'Заполняет анкету, ищет корты для брони и отправляет вызовы другим игрокам.',
    href: '/players',
  },
  {
    title: 'Партнёр',
    copy: 'Заполняет профиль, заводит площадки с кортами, проходит верификацию и обрабатывает входящие заявки.',
    href: '/me/partner',
  },
  {
    title: 'Администратор',
    copy: 'Проверяет заявки на верификацию партнёров и открывает им путь в публичный каталог.',
    href: '/admin/verification-requests',
  },
];

const steps = [
  'Войдите через демо-аккаунт игрока, партнёра или администратора.',
  'Заполните профиль игрока или партнёра.',
  'Партнёр создаёт площадку и хотя бы один корт.',
  'Партнёр задаёт расписание корта и при необходимости исключения.',
  'Партнёр проходит верификацию, чтобы площадка попала в публичный каталог.',
  'Игрок создаёт заявку на бронь по подтверждённой и активной площадке.',
  'Партнёр подтверждает, отклоняет, отменяет или завершает заявку.',
  'Игрок находит соперника в каталоге и отправляет ручной вызов на игру.',
];

const flowLinks = [
  { href: '/demo/auth', title: 'Вход в демо', copy: 'Выберите один из подготовленных аккаунтов.' },
  {
    href: '/me/player',
    title: 'Профиль игрока',
    copy: 'Заполните карточку игрока и подготовьте аккаунт к бронированию.',
  },
  {
    href: '/me/partner',
    title: 'Профиль партнёра',
    copy: 'Укажите основные сведения о клубе или организации.',
  },
  {
    href: '/me/partner/venues',
    title: 'Площадки и корты',
    copy: 'Создайте локацию, задайте адрес, корт и расписание.',
  },
  {
    href: '/me/partner/verification',
    title: 'Верификация',
    copy: 'Отправьте профиль партнёра на проверку администратору.',
  },
  {
    href: '/booking-requests',
    title: 'Заявки игрока',
    copy: 'Создайте заявку на бронь и следите за её статусом.',
  },
  {
    href: '/players',
    title: 'Каталог игроков',
    copy: 'Найдите соперника и отправьте ручной вызов на игру.',
  },
  {
    href: '/match-requests',
    title: 'Вызовы на игру',
    copy: 'Примите, отклоните или отмените вызов другого игрока.',
  },
  {
    href: '/me/partner/booking-requests',
    title: 'Входящие заявки партнёра',
    copy: 'Подтверждайте, отклоняйте, отменяйте и завершайте заявки.',
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
      title="Рабочий демо-срез MVP"
      description="Сейчас в проекте уже собран связный путь: профили, площадки и корты, верификация партнёра и первый рабочий сценарий заявок на бронь."
    >
      <div className="split-grid">
        <Card accent>
          <h3>Что уже работает</h3>
          <div className="info-list">
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Демо-авторизация и базовые роли
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Профили игрока и партнёра
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Площадки, корты и публичный каталог подтверждённых партнёров
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Верификация партнёра и проверка администратором
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Заявки на бронь со статусной историей и аудитом
            </p>
            <p>
              <StatusBadge tone="success">Работает</StatusBadge> Каталог игроков и ручные вызовы на игру
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

      <Notice title="Быстрый способ проверить публичный каталог">
        После одобрения партнёра откройте Swagger на <strong>http://localhost:4000/api/v1/docs</strong> и
        вызовите <strong>GET /venues</strong>. Там должны быть только активные площадки подтверждённых партнёров.
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
