# tennis_spot

`tennis_spot` is a web-first MVP in modular monolith format for players, partners and admins.
The repository is currently an internal runnable MVP baseline with a runnable vertical path:

- demo authentication
- player and partner profiles
- partner verification and admin review
- partner venues and courts
- partner court schedules and date exceptions
- public venue catalog for verified partners
- request-based booking flow with availability validation
- in-app notifications for verification and booking events
- manual match requests between players
- match-to-booking linkage for accepted match requests

## Product language

- User-facing texts in UI, API messages and Swagger stay in Russian.
- Technical identifiers, routes, enum keys, role keys and statuses stay in English to preserve the API contract.

## Implemented status contract

These statuses are implemented by the current Prisma schema, API, `/reference/enums` endpoint and shared package.

Partner verification status:

- `draft`
- `pending_verification`
- `verified`
- `rejected`
- `suspended`
- `archived`

Verification request status:

- `draft`
- `submitted`
- `in_review`
- `approved`
- `rejected`
- `needs_correction`

Booking request status:

- `draft`
- `pending`
- `confirmed`
- `rejected`
- `cancelled_by_player`
- `cancelled_by_partner`
- `expired`
- `completed`

Match request status:

- `pending`
- `accepted`
- `declined`
- `cancelled`

Future match statuses such as `draft`, `sent`, `viewed`, `expired` and `completed` belong to the wider product vision and are not exposed as implemented match request statuses in the current API.

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
- public `GET /partners` and `GET /partners/{partnerId}` for verified partner profiles only
- public `GET /booking-requests/options` for подбор подходящих кортов по условиям
- booking requests with status history, conflict checks and audit logs
- in-app notifications with unread count and read actions
- manual player-to-player match requests with accept, decline and cancel actions
- booking creation from accepted match requests
- complaints/disputes v1 with user submission, admin status lifecycle and notifications
- unified response envelope and unified error envelope

### Frontend

- `/`
- `/demo/auth`
- `/me/player`
- `/players`
- `/players/[id]`
- `/match-requests`
- `/me/partner`
- `/me/partner/venues`
- `/me/partner/verification`
- `/booking-requests`
- `/complaints`
- `/me/partner/booking-requests`
- `/notifications`
- `/admin/verification-requests`
- `/admin/verification-requests/[id]`
- `/admin/complaints`

### Current hardening rules for venues and courts

- partner inventory is owned through `partner_profile -> owner_user`
- a user can manage only their own venues and courts
- a user can manage schedules only for their own courts
- public catalog shows only `verified` partner venues with `isActive=true`
- public venue details include only active courts
- public partner routes show only verified partners and omit private legal/tax/owner fields
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

## Public endpoint rules

- `GET /partners` returns only verified partner profiles.
- `GET /partners/{partnerId}` returns only a verified partner profile and exposes only public-safe fields. Unverified, rejected, suspended or archived partner profiles are returned as not found.
- `GET /venues` returns only active venues owned by verified partners.
- `GET /venues/{venueId}` returns only active verified-partner venues and includes only active courts.
- `GET /players` returns only active player profiles that are visible to authenticated users.
- `POST /partner/verification/submit` requires at least one verification document.

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

Running `npm run db:seed` is idempotent for the demo baseline: it re-normalizes demo roles, removes drifted partner profiles for `demo-player`, `demo-partner`, `demo-admin`, and recreates a single reviewable `review-partner` verification scenario.

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
10. Add at least one verification document
11. Submit the verification request
12. Sign in as `demo-admin`
13. Open `/admin/verification-requests`
14. Approve the request

### Booking flow

1. Complete the partner inventory flow above
2. Sign out and sign in as `demo-player`
3. Open `/me/player` and create the player profile
4. Open `/booking-requests`
5. Set search filters: city or district if needed, date, time range, surface, court type and players count
6. Click `Подобрать варианты`
7. Choose one of the suitable court cards
8. Fill the short request form and submit the booking request
10. Sign out and sign in as `demo-partner`
11. Open `/me/partner/booking-requests`
12. Confirm, reject, cancel or complete the request
13. Sign back in as `demo-player` and verify the updated status

### Notifications flow

1. Complete the booking flow until the player creates a booking request
2. Sign in as `demo-partner`
3. Open `/notifications`
4. Confirm that the partner sees a new booking notification
5. Open `/me/partner/booking-requests` and confirm the request
6. Sign in as `demo-player`
7. Open `/notifications`
8. Confirm that the player sees the booking confirmation notification
9. Use `Прочитать` or `Прочитать всё` and confirm that the unread count changes

Verification also creates notifications:

- when a partner submits verification, admins receive `verification_submitted`
- when an admin approves, rejects or requests corrections, the partner receives the result

### Match request flow

1. Sign in as `demo-player`
2. Open `/me/player` and create or update the player profile
3. Sign in as `demo-partner`
4. Open `/me/player` and create or update a second player profile
5. Sign back in as `demo-player`
6. Open `/players`
7. Choose the second player and open their card
8. Click `Отправить вызов`
9. Sign in as `demo-partner`
10. Open `/match-requests`
11. Accept or decline the incoming challenge
12. Sign back in as `demo-player`
13. Open `/match-requests` or `/notifications` and confirm that the status changed

### Match to booking flow

1. Complete the partner inventory flow and make sure `demo-partner` has a verified venue, court and schedule
2. Sign in as `demo-player` (player A)
3. Open `/me/player` and create or update the player profile
4. Sign in as `demo-partner` as player B
5. Open `/me/player` and create or update the second player profile
6. Sign back in as `demo-player`
7. Open `/players`, choose player B and send a match request
8. Sign in as `demo-partner`, open `/match-requests` and accept the challenge
9. Sign back in as `demo-player`, open `/match-requests` and confirm the accepted card shows `Оформить бронь для этой игры`
10. Click the CTA and verify `/booking-requests` opens with the game context: opponent, date, time, format and players count
11. Choose an available court through the booking discovery flow
12. Submit the request-based booking and confirm the success message says the booking request is linked to the match
13. Sign in as player B and confirm the `Создана заявка на бронь для вашей игры` notification is present
14. Sign in as `demo-partner`, open `/me/partner/booking-requests` and confirm the booking
15. Sign back in as player A and verify `/match-requests` shows the linked booking status without raw enum values

### Complaints / disputes flow

1. Complete a booking flow or create a match request
2. Open `/booking-requests` or `/match-requests`
3. Click `Пожаловаться`
4. Fill the short form: type and description
5. Submit the complaint
6. Sign in as `demo-admin`
7. Open `/admin/complaints`
8. Change the status to `В работе`, `Решено` or `Отклонено`
9. Sign back in as the player
10. Open `/notifications` and confirm the complaint status notification is present
11. Open `/complaints` and confirm the status and admin response are visible

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

`weekday` uses `0-6`: `0` is Sunday, `1` is Monday, `6` is Saturday.

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

Add at least one document before submission:

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/partner/verification/documents" `
  -H "Authorization: Bearer <PARTNER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"documentType\":\"registration_certificate\",\"originalName\":\"registration.pdf\",\"storageKey\":\"demo/registration.pdf\",\"mimeType\":\"application/pdf\",\"sizeBytes\":1024}"
```

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

### Discover booking options by player requirements

```powershell
curl.exe "http://localhost:4000/api/v1/booking-requests/options?cityId=<CITY_ID>&districtId=<DISTRICT_ID>&bookingDate=2026-04-20&timeFrom=18:00&timeTo=19:30&surfaceType=hard&courtType=indoor&playersCount=2"
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

### List notifications

```powershell
curl.exe "http://localhost:4000/api/v1/notifications" `
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Get unread notifications count

```powershell
curl.exe "http://localhost:4000/api/v1/notifications/unread-count" `
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Mark notification as read

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/notifications/<NOTIFICATION_ID>/read" `
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Mark all notifications as read

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/notifications/read-all" `
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### List players

```powershell
curl.exe "http://localhost:4000/api/v1/players" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>"
```

### Create match request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/match-requests" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"opponentId\":\"<OPPONENT_USER_ID>\",\"proposedDate\":\"2099-04-20\",\"proposedTimeFrom\":\"18:00\",\"proposedTimeTo\":\"19:30\",\"format\":\"singles\",\"message\":\"Сыграем тренировочный сет?\"}"
```

### List incoming match requests

```powershell
curl.exe "http://localhost:4000/api/v1/match-requests/incoming" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>"
```

### Accept match request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/match-requests/<MATCH_REQUEST_ID>/accept" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>"
```

### Create booking from accepted match request

```powershell
curl.exe -X POST "http://localhost:4000/api/v1/match-requests/<MATCH_REQUEST_ID>/create-booking" `
  -H "Authorization: Bearer <PLAYER_ACCESS_TOKEN>" `
  -H "Content-Type: application/json" `
  -d "{\"venueId\":\"<VENUE_ID>\",\"courtId\":\"<COURT_ID>\",\"commentFromPlayer\":\"Бронь для принятого вызова\"}"
```

## Run e2e tests

```bash
npm run test:e2e
```

The e2e suite boots the Nest app over an in-memory Prisma double, so the current slices can be tested without Docker-dependent test infrastructure.

## Run real-DB smoke

The real-DB smoke is intentionally small. It validates the migrated PostgreSQL schema, seed baseline and a representative API path with real Prisma/Postgres.

For a clean local PostgreSQL baseline:

```bash
docker compose up -d
npm run db:deploy
npm run db:seed
npm run smoke:real-db
```

The smoke script creates unique phone-auth users and checks:

- phone/demo auth
- player profile creation
- partner profile update
- verification document + submit + admin approval
- public partner visibility
- venue/court/schedule creation
- booking options
- booking request + partner confirmation
- match request + accept
- accepted match request -> linked booking request
- notification read action

## Current deliberate boundaries

- booking is request-based, not instant booking
- schedule layer is template + exceptions + on-demand availability calculation
- no payments in MVP
- no realtime lock engine or complex calendar planner
- notifications are in-app only, without email, push, websocket or event bus
- match requests are manual challenges, not an automated matchmaking algorithm
- verification document upload is still demo-oriented metadata storage
- verification submission requires at least one document
- no public marketplace UI beyond the API-backed catalog checks
- tournament, chat, payments, realtime booking and advanced matchmaking remain future vision, not current baseline

## Next iteration focus

- booking request expiration rules
- notification links to exact related pages
- complaints and moderation tooling
