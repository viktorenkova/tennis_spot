const foundations = [
  'NestJS API with Prisma, Swagger and auth/reference/player/partner foundations',
  'Next.js App Router frontend shell for the web MVP',
  'PostgreSQL + Redis docker-compose and starter env templates',
  'Seed strategy for roles, partner types, Moscow and Saint Petersburg',
];

const nextModules = [
  'Phone-first auth flows with real SMS provider integration boundary',
  'Player and partner UI flows over the bootstrapped REST contract',
  'Venue, court scheduling and booking-request workflows',
  'Conversations, tournaments and moderation modules',
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">tennis_spot</p>
        <h1>Production-minded foundation for the web MVP</h1>
        <p className="lead">
          The monolith foundation is ready to grow around the agreed product model: players,
          partners, verification, courts, booking requests, matchmaking, chat and tournaments.
        </p>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Foundation in place</h2>
          <ul>
            {foundations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel accent">
          <h2>Next implementation wave</h2>
          <ul>
            {nextModules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
