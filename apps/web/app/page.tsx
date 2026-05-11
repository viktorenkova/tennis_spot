import Image from 'next/image';
import Link from 'next/link';

const navigation = [
  { href: '/players', label: 'Игрокам' },
  { href: '/match-requests', label: 'Сообщество' },
  { href: '/booking-requests', label: 'Корты' },
  { href: '/auth/register', label: 'Клубам' },
];

const features = [
  {
    title: 'Найти игроков',
    copy: 'Партнеры по уровню, району и ритму игры.',
    href: '/players',
  },
  {
    title: 'Играть матчи',
    copy: 'Договаривайтесь о встречах и собирайте игру рядом.',
    href: '/match-requests',
  },
  {
    title: 'Бронировать корты',
    copy: 'Выбирайте площадку, время и отправляйте заявку клубу.',
    href: '/booking-requests',
  },
  {
    title: 'Развиваться',
    copy: 'Ведите профиль игрока и видьте свой следующий шаг.',
    href: '/me/player',
  },
  {
    title: 'Клубам',
    copy: 'Показывайте корты, принимайте заявки и растите аудиторию.',
    href: '/auth/register',
  },
  {
    title: 'Быть на связи',
    copy: 'Получайте важные события по матчам, заявкам и клубам.',
    href: '/notifications',
  },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-topbar">
        <Link href="/" className="landing-brand" aria-label="RAQET">
          <Image
            src="/brand/logo.png"
            alt="RAQET"
            width={520}
            height={160}
            className="landing-logo"
            priority
          />
        </Link>

        <nav className="landing-nav" aria-label="Главная навигация">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="landing-actions">
          <Link href="/auth/login" className="landing-login">
            Войти
          </Link>
          <Link href="/auth/register" className="landing-join">
            Присоединиться
          </Link>
        </div>

        <details className="landing-mobile-menu">
          <summary aria-label="Открыть меню">Меню</summary>
          <div className="landing-mobile-panel">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/auth/login">Войти</Link>
            <Link href="/auth/register" className="landing-mobile-join">
              Присоединиться
            </Link>
          </div>
        </details>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Современное теннисное сообщество</p>
          <h1 id="landing-title" className="landing-title">
            <span>Найди.</span>
            <span>Играй.</span>
            <span className="landing-title-accent">Расти вместе.</span>
          </h1>
          <p className="landing-lead">
            RAQET соединяет игроков, клубы и корты в одном живом пространстве для тех,
            кто хочет чаще выходить на игру и расти в своем темпе.
          </p>

          <div className="landing-cta-row">
            <Link href="/auth/register" className="landing-primary-cta">
              Присоединиться к RAQET
            </Link>
            <Link href="/booking-requests" className="landing-secondary-cta">
              Найти корт
            </Link>
          </div>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <Image
            src="/brand/hero-phone-transparent.png"
            alt=""
            width={1365}
            height={1152}
            className="landing-phone"
            priority
          />
        </div>
      </section>

      <section className="landing-features" aria-label="Возможности RAQET">
        {features.map((feature, index) => (
          <Link key={feature.title} href={feature.href} className="landing-feature">
            <span className="landing-feature-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="landing-feature-title">{feature.title}</span>
            <span className="landing-feature-copy">{feature.copy}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
