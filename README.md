# tennis_spot

`tennis_spot` is a web-first MVP in modular monolith format for players, partners and admins.
The repository already contains a runnable vertical path:

- demo authentication
- player and partner profiles
- partner verification and admin review
- partner venues and courts
- partner court schedules and date exceptions
- public venue catalog for verified partners
- request-based booking flow with availability validation

## Product language

- User-facing texts in UI, API messages and Swagger stay in Russian.
- Technical identifiers, routes, enum keys, role keys and statuses stay in English to preserve the API contract.

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

## What is implemented now

### Backend

- JWT auth foundation
- dev-only `POST /auth/demo/login`
- player profile create/update/read
- partner profile create/update/read
- partner verification submission and admin moderation
- partner venue and court management
- partner court schedule templates and exceptions
- public `GET /courts/{courtId}/availability?date=YYYY-MM-DD`
- public `GET /venues` catalog for verified and active partner inventory
- booking requests with status history, conflict checks and audit logs
- unified response envelope and unified error envelope

### Frontend

- `/`
- `/demo/auth`
- `/me/player`
- `/me/partner`
- `/me/partner/venues`
- `/me/partner/verification`
- `/booking-requests`
- `/me/partner/booking-requests`
- `/admin/verification-requests`
- `/admin/verification-requests/[id]`

### Current hardening rules for venues and courts

- partner inventory is owned through `partner_profile -> owner_user`
- a user can manage only their own venues and courts
- a user can manage schedules only for their own courts
- public catalog shows only `verified` partner venues with `isActive=true`
- public venue details include only active courts
- courts stay strictly attached to their venue
- booking creation is validated against court schedule, exceptions and active request conflicts

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

## Manual smoke flows

### Partner inventory flow

1. Open `http://localhost:3000/demo/auth`
2. Sign in as `demo-partner`
3. Open `/me/partner` and create the partner profile
4. Open `/me/partner/venues`
5. Create a venue
6. Create at least one court
7. Add at least one weekly schedule template for that court
8. Add an exception if you want to test closed, blocked or custom-hours logic
9. Open `/me/partner/verification`
10. Submit the verification request
11. Sign in as `demo-admin`
12. Open `/admin/verification-requests`
13. Approve the request

### Booking flow

1. Complete the partner inventory flow above
2. Sign out and sign in as `demo-player`
3. Open `/me/player` and create the player profile
4. Open `/booking-requests`
5. Pick a venue from the public catalog
6. Pick a court and date
7. Verify that the page loads court availability and valid intervals
8. Select one of the allowed intervals
9. Create the booking request
10. Sign out and sign in as `demo-partner`
11. Open `/me/partner/booking-requests`
12. Confirm, reject, cancel or complete the request
13. Sign back in as `demo-player` and verify the updated status

### Fast admin flow

1. Open `http://localhost:3000/demo/auth`
2. Sign in as `demo-admin`
3. Open `/admin/verification-requests`
4. Open the seeded `review-partner` request
5. Run one of the review actions

## Public catalog check

If you want to verify the public catalog without building a separate marketplace screen:

1. Open Swagger at `http://localhost:4000/api/v1/docs`
2. Call `GET /venues`
3. Confirm that only active venues of verified partners are present
4. Call `GET /venues/{venueId}`
5. Confirm that only active courts are returned inside that venue

## Schedule and availability check

To verify the minimal schedule layer directly:

1. Open Swagger at `http://localhost:4000/api/v1/docs`
2. Use partner auth and call:
   - `POST /partner/courts/{courtId}/schedule-templates`
   - `POST /partner/courts/{courtId}/schedule-exceptions`
3. Call `GET /courts/{courtId}/availability?date=YYYY-MM-DD`
4. Confirm that the response changes when you add:
   - `closed`
   - `blocked`
   - `custom_hours`
   - `custom_price`
5. Try `POST /booking-requests` with:
   - a valid interval inside the schedule
   - an interval outside the schedule
   - an interval blocked by exception
6. Confirm that only the valid request is accepted

## Smoke test curl commands

### Demo login as player

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/auth/demo/login" `
  -H "Content-Type: application/json" `
  -d "{\"userKey\":\"demo-player\"}"
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

### Create venue

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/venues" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"North Court Arena\",\"cityId\":\"<CITY_ID>\",\"districtId\":\"<DISTRICT_ID>\",\"line1\":\"Lenina 10\"}"
```

### Create court

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/venues/<VENUE_ID>/courts" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Court 1\",\"surfaceType\":\"hard\",\"isIndoor\":true}"
```

### Create court schedule template

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/courts/<COURT_ID>/schedule-templates" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"weekday\":1,\"timeFrom\":\"18:00\",\"timeTo\":\"19:30\",\"slotDurationMinutes\":90,\"isOpen\":true,\"basePrice\":1800}"
```

### Create court schedule exception

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/courts/<COURT_ID>/schedule-exceptions" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"date\":\"2026-04-20\",\"exceptionType\":\"custom_price\",\"timeFrom\":\"18:00\",\"timeTo\":\"19:30\",\"customPrice\":2500,\"comment\":\"Prime time\"}"
```

### Check court availability

```powershell
curl.exe "http://localhost:4000/api/v1/courts/<COURT_ID>/availability?date=2026-04-20"
```

### Submit verification request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/verification/submit" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>"
```

### Create booking request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/booking-requests" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"venueId\":\"<VENUE_ID>\",\"courtId\":\"<COURT_ID>\",\"bookingDate\":\"2026-04-20\",\"timeFrom\":\"18:00\",\"timeTo\":\"19:00\",\"playersCount\":2}"
```

### List partner booking requests

```powershell
curl.exe "http://localhost:4000/api/v1/partner/booking-requests" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>"
```

### Confirm booking request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/booking-requests/<REQUEST_ID>/confirm" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"commentFromPartner\":\"See you on court\"}"
```

## Run e2e tests

```bash
npm run test:e2e
```

The e2e suite boots the Nest app over an in-memory Prisma double, so the current slices can be tested without Docker-dependent test infrastructure.

## Current deliberate boundaries

- booking is request-based, not instant booking
- schedule layer is template + exceptions + on-demand availability calculation
- no payments in MVP
- no realtime lock engine or complex calendar planner
- verification document upload is still demo-oriented metadata storage
- no public marketplace UI beyond the API-backed catalog checks

## Next iteration focus

- booking request expiration rules
- notifications
- complaints and moderation tooling
