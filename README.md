# tennis_spot

`tennis_spot` - это web MVP в формате modular monolith для игроков, партнеров и администраторов.
В репозитории уже собран первый обзорный вертикальный срез `P1-week1`:

- авторизация с удобным dev-friendly demo login
- создание и обновление профиля игрока
- создание и обновление профиля партнера
- отправка заявки на верификацию партнера
- очередь модерации заявок для администратора
- аудит-логи для действий по верификации
- минимальный reviewable web UI
- e2e-покрытие для текущего среза

## Язык продукта

- Все пользовательские тексты интерфейса, human-readable сообщения API и Swagger-описания ведем на русском языке.
- Технические идентификаторы, route paths, enum keys, role keys и статусы в контракте остаются на английском, чтобы не ломать API и доменную модель.

## Стек

- `apps/api` - NestJS + Prisma + PostgreSQL
- `apps/web` - Next.js App Router + TypeScript
- `packages/shared` - общие константы
- `docker-compose.yml` - local PostgreSQL + Redis

## Структура репозитория

```text
apps/
  api/
  web/
packages/
  shared/
```

## Что реализовано в текущем срезе

### Backend

- foundation для JWT-авторизации
- dev-only `POST /auth/demo/login`
- `GET/PATCH /user/settings`
- создание, обновление и чтение профиля игрока
- создание, обновление и чтение профиля партнера
- отправка и чтение заявки на верификацию
- admin-only endpoints для модерации верификации
- role guard с защитой `admin/superadmin`
- единый response envelope и единый error envelope
- реальные записи в audit log для подачи и модерации заявок

### Frontend

- `/`
- `/demo/auth`
- `/me/player`
- `/me/partner`
- `/me/partner/verification`
- `/admin/verification-requests`
- `/admin/verification-requests/[id]`

### Покрытие тестами

- happy path от авторизации до admin approval
- `403` для non-admin
- `400` при reject без комментария
- `404` для неизвестной заявки
- `409` при повторном review уже финализированной заявки
- `409` при повторной отправке активной заявки на верификацию

## Environment setup

1. Copy env templates.

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Bash:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

2. Install dependencies:

```bash
npm install
```

3. Start infrastructure:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## Database setup

Generate Prisma client:

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

Seed all demo data:

```bash
npm run db:seed
```

Ensure admin only:

```bash
npm run db:seed-admin
```

## Seeded demo access

The main seed creates:

- roles: `player`, `partner`, `admin`, `superadmin`
- partner types: `club`, `school`, `organizer`, `store`, `mixed`
- cities: `Москва`, `Санкт-Петербург`
- `demo-player` -> `+79990000001`
- `demo-partner` -> `+79990000002`
- `demo-admin` -> `+79990000003`
- `review-partner` -> `+79990000004`
- a seeded partner profile with a submitted verification request for fast admin review

Demo login is enabled only when `AUTH_ENABLE_DEMO_LOGIN=true`.

## Run the apps

Run both:

```bash
npm run dev
```

Or separately:

```bash
npm run dev:api
npm run dev:web
```

Important URLs:

- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/v1/docs`
- Web UI: `http://localhost:3000`

## Manual demo flow

### Clean flow

1. Open `http://localhost:3000/demo/auth`
2. Sign in as `demo-partner`
3. Open `/me/player` and create or update the player profile
4. Open `/me/partner` and create the partner profile
5. Open `/me/partner/verification`
6. Optionally add a demo verification document
7. Submit verification request
8. Sign out
9. Sign in as `demo-admin`
10. Open `/admin/verification-requests`
11. Open the newly submitted request
12. Approve, reject or send to needs correction
13. Observe updated status on the detail screen and on the partner side after signing back in

### Fast admin flow

1. Open `http://localhost:3000/demo/auth`
2. Sign in as `demo-admin`
3. Open `/admin/verification-requests`
4. Open the seeded `review-partner` request
5. Run one of the review actions

## Smoke test curl commands

### Demo login as admin

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/auth/demo/login" `
  -H "Content-Type: application/json" `
  -d "{\"userKey\":\"demo-admin\"}"
```

### Demo login as partner

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/auth/demo/login" `
  -H "Content-Type: application/json" `
  -d "{\"userKey\":\"demo-partner\"}"
```

### Create partner profile

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/profile" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"legalName\":\"North Court LLC\",\"brandName\":\"North Court\",\"partnerTypes\":[\"club\"]}"
```

### Submit verification request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/verification/submit" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>"
```

### List verification requests as admin

```powershell
curl.exe "http://localhost:4000/api/v1/admin/verification-requests?status=submitted" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### Approve verification request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/admin/verification-requests/<REQUEST_ID>/approve" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"comment\":\"Looks good\"}"
```

### Reject verification request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/admin/verification-requests/<REQUEST_ID>/reject" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"comment\":\"Missing company documents\"}"
```

### Needs correction

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/admin/verification-requests/<REQUEST_ID>/needs-correction" `
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"comment\":\"Please upload a clearer registration certificate\"}"
```

## Run e2e tests

```bash
npm run test:e2e
```

The e2e suite boots the Nest app over an in-memory Prisma double so the review slice can be tested
without Docker-dependent test infrastructure.

## Current deliberate boundaries

- verification document upload is demo-oriented metadata storage, not a production S3 flow yet
- phone auth remains available, but demo login is the fastest local review path
- venues, courts, bookings, chat, matchmaking and tournaments are intentionally out of this slice

## Next iteration focus

- venues and courts
- booking request workflow
- richer audit browsing
- admin user management
- production-grade file handling
