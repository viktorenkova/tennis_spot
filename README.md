# tennis_spot

`tennis_spot` is a modular monolith web MVP for players, partners and admins.
This repository now contains the first reviewable vertical slice for `P1-week1`:

- auth with dev-friendly demo login
- player profile create/update
- partner profile create/update
- partner verification submission
- admin verification review queue
- audit logs for verification actions
- minimal reviewable web UI
- e2e coverage for the slice

## Stack

- `apps/api` - NestJS + Prisma + PostgreSQL
- `apps/web` - Next.js App Router + TypeScript
- `packages/shared` - shared constants
- `docker-compose.yml` - local PostgreSQL + Redis

## Repository structure

```text
apps/
  api/
  web/
packages/
  shared/
```

## What is implemented in this slice

### Backend

- JWT auth foundation
- dev-only `POST /auth/demo/login`
- `GET/PATCH /user/settings`
- player profile create/update/read
- partner profile create/update/read
- partner verification submit/read
- admin-only verification review endpoints
- role guard with `admin/superadmin` protection
- unified response envelope and unified error envelope
- audit log writes for verification submission and review actions

### Frontend

- `/`
- `/demo/auth`
- `/me/player`
- `/me/partner`
- `/me/partner/verification`
- `/admin/verification-requests`
- `/admin/verification-requests/[id]`

### Test coverage

- happy path from auth to admin approval
- non-admin `403`
- reject without comment `400`
- unknown request `404`
- duplicate finalized review `409`
- duplicate active verification submit `409`

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
