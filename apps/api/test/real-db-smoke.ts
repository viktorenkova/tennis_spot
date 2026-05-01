import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type SmokeUser = TokenPair & {
  userId: string;
};

function nextDateForWeekday(targetWeekday: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  const daysUntilTarget = (targetWeekday - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilTarget);

  return date.toISOString().slice(0, 10);
}

async function phoneLogin(app: INestApplication, phone: string): Promise<SmokeUser> {
  const challengeResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/phone/request-code')
    .send({ phone })
    .expect(201);

  const code = challengeResponse.body.data.code;

  if (!code) {
    throw new Error('AUTH_DEV_RETURN_CODE must be true for real DB smoke phone login.');
  }

  const tokenResponse = await request(app.getHttpServer())
    .post('/api/v1/auth/phone/verify-code')
    .send({
      phone,
      challengeId: challengeResponse.body.data.challengeId,
      code,
    })
    .expect(201);

  const meResponse = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${tokenResponse.body.data.accessToken}`)
    .expect(200);

  return {
    accessToken: tokenResponse.body.data.accessToken,
    refreshToken: tokenResponse.body.data.refreshToken,
    userId: meResponse.body.data.id,
  };
}

async function demoAdminLogin(app: INestApplication): Promise<TokenPair> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/demo/login')
    .send({ userKey: 'demo-admin' })
    .expect(201);

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}

async function main() {
  process.env.AUTH_DEV_RETURN_CODE = process.env.AUTH_DEV_RETURN_CODE ?? 'true';
  process.env.AUTH_ENABLE_DEMO_LOGIN = process.env.AUTH_ENABLE_DEMO_LOGIN ?? 'true';

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();

  try {
    const runId = randomUUID().slice(0, 8);
    const partnerPhone = `+79991${Date.now().toString().slice(-7)}`;
    const playerPhone = `+79992${Date.now().toString().slice(-7)}`;
    const admin = await demoAdminLogin(app);
    const partner = await phoneLogin(app, partnerPhone);
    const player = await phoneLogin(app, playerPhone);
    const bookingDate = nextDateForWeekday(1);

    const citiesResponse = await request(app.getHttpServer()).get('/api/v1/reference/cities').expect(200);
    const city = citiesResponse.body.data[0];
    const districtId = city.districts[0]?.id;

    await request(app.getHttpServer())
      .post('/api/v1/player/profile')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        firstName: 'Smoke',
        lastName: 'Partner',
        bio: 'Real DB smoke partner player profile',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/player/profile')
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({
        firstName: 'Smoke',
        lastName: 'Player',
        bio: 'Real DB smoke player profile',
      })
      .expect(201);

    const partnerProfileResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/profile')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        legalName: `Smoke Club ${runId}`,
        brandName: `Smoke Club ${runId}`,
        description: 'Real DB smoke partner profile',
        cityId: city.id,
        districtId,
        partnerTypes: ['club'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        description: 'Real DB smoke partner profile updated',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/partner/verification/documents')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        documentType: 'registration_certificate',
        originalName: 'registration.pdf',
        storageKey: `smoke/${runId}/registration.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      })
      .expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${submitResponse.body.data.id}/approve`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ comment: 'Approved by real DB smoke.' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/partners/${partnerProfileResponse.body.data.id}`)
      .expect(200);

    const venueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        name: `Smoke Venue ${runId}`,
        cityId: city.id,
        districtId,
        line1: 'Smoke street 1',
        isActive: true,
      })
      .expect(201);

    const courtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        name: 'Smoke Court 1',
        surfaceType: 'hard',
        isIndoor: true,
        hasLighting: true,
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/partner/courts/${courtResponse.body.data.id}/schedule-templates`)
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        weekday: 1,
        timeFrom: '18:00',
        timeTo: '19:30',
        slotDurationMinutes: 90,
        isOpen: true,
        basePrice: 1500,
      })
      .expect(201);

    const optionsResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${city.id}&bookingDate=${bookingDate}&timeFrom=18:00&timeTo=19:30&surfaceType=hard&courtType=indoor&playersCount=2`,
      )
      .expect(200);

    if (!optionsResponse.body.data.length) {
      throw new Error('Expected at least one booking option in real DB smoke.');
    }

    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({
        venueId: venueResponse.body.data.id,
        courtId: courtResponse.body.data.id,
        bookingDate,
        timeFrom: '18:00',
        timeTo: '19:30',
        playersCount: 2,
        commentFromPlayer: 'Real DB smoke booking',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/partner/booking-requests/${bookingResponse.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({
        commentFromPartner: 'Confirmed by real DB smoke.',
      })
      .expect(201);

    const matchResponse = await request(app.getHttpServer())
      .post('/api/v1/match-requests')
      .set('Authorization', `Bearer ${player.accessToken}`)
      .send({
        opponentId: partner.userId,
        proposedDate: nextDateForWeekday(2),
        proposedTimeFrom: '18:00',
        proposedTimeTo: '19:30',
        format: 'singles',
        message: 'Real DB smoke match request',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({})
      .expect(201);

    const notificationsResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .expect(200);

    if (!notificationsResponse.body.data.length) {
      throw new Error('Expected partner notifications in real DB smoke.');
    }

    await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationsResponse.body.data[0].id}/read`)
      .set('Authorization', `Bearer ${partner.accessToken}`)
      .send({})
      .expect(201);

    console.log('Real DB smoke passed.');
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
