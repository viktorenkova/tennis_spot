import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { InMemoryPrismaService } from './in-memory-prisma';

describe('P1 review and booking slices (e2e)', () => {
  let app: INestApplication;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';
    process.env.AUTH_ENABLE_DEMO_LOGIN = 'true';
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrismaService())
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function demoLogin(userKey: 'demo-player' | 'demo-partner' | 'demo-admin' | 'review-partner') {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .send({ userKey })
      .expect(201);

    return response.body.data.accessToken as string;
  }

  async function getDemoLocation() {
    const response = await request(app.getHttpServer()).get('/api/v1/reference/cities').expect(200);
    const city = response.body.data[0];

    return {
      cityId: city.id as string,
      districtId: city.districts[0]?.id as string | undefined,
    };
  }

  function createPlayerProfile(accessToken: string, firstName = 'Ivan', lastName = 'Petrov') {
    return request(app.getHttpServer())
      .post('/api/v1/player/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName,
        lastName,
        bio: `${firstName} profile`,
        ntrpSelfRating: 3.5,
      });
  }

  function createPartnerProfile(accessToken: string, cityId: string, districtId?: string) {
    return request(app.getHttpServer())
      .post('/api/v1/partner/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        legalName: 'North Court LLC',
        brandName: 'North Court',
        description: 'Indoor club',
        cityId,
        districtId,
        partnerTypes: ['club'],
      });
  }

  function createScheduleTemplate(
    accessToken: string,
    courtId: string,
    overrides: Partial<{
      weekday: number;
      timeFrom: string;
      timeTo: string;
      slotDurationMinutes: number;
      isOpen: boolean;
      basePrice: number;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/partner/courts/${courtId}/schedule-templates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        weekday: 1,
        timeFrom: '18:00',
        timeTo: '19:30',
        slotDurationMinutes: 90,
        isOpen: true,
        ...overrides,
      });
  }

  function createScheduleException(
    accessToken: string,
    courtId: string,
    overrides: Partial<{
      date: string;
      exceptionType: 'closed' | 'custom_hours' | 'blocked' | 'custom_price';
      timeFrom: string;
      timeTo: string;
      customPrice: number;
      comment: string;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/partner/courts/${courtId}/schedule-exceptions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        date: '2026-04-20',
        exceptionType: 'blocked',
        timeFrom: '19:00',
        timeTo: '19:30',
        comment: 'Blocked for maintenance',
        ...overrides,
      });
  }

  async function approveVerificationRequestForPhone(adminToken: string, phone: string) {
    const queueResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests?status=submitted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const verificationRequest = queueResponse.body.data.find(
      (item: any) => item.partnerProfile.ownerUser.phone === phone,
    );

    expect(verificationRequest).toBeDefined();

    return request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${verificationRequest.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Approved for public catalog.',
      })
      .expect(201);
  }

  async function prepareVerifiedInventory() {
    const location = await getDemoLocation();
    const partnerToken = await demoLogin('demo-partner');

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const adminToken = await demoLogin('demo-admin');
    await approveVerificationRequestForPhone(adminToken, '+79990000002');

    const venueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Verified Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Lenina 10',
        isActive: true,
      })
      .expect(201);

    const courtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Court 1',
        surfaceType: 'hard',
        isIndoor: true,
        hasLighting: true,
        isActive: true,
      })
      .expect(201);

    await createScheduleTemplate(partnerToken, courtResponse.body.data.id).expect(201);

    return {
      location,
      adminToken,
      partnerToken,
      venueId: venueResponse.body.data.id as string,
      courtId: courtResponse.body.data.id as string,
    };
  }

  function createBookingRequest(accessToken: string, venueId: string, courtId: string) {
    return request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        venueId,
        courtId,
        bookingDate: '2026-04-20',
        timeFrom: '18:00',
        timeTo: '19:30',
        playersCount: 2,
        commentFromPlayer: 'Evening game',
      });
  }

  it('runs the happy path from demo auth to admin approval', async () => {
    const partnerToken = await demoLogin('demo-partner');

    const playerProfileResponse = await createPlayerProfile(partnerToken).expect(201);
    expect(playerProfileResponse.body.success).toBe(true);
    expect(playerProfileResponse.body.data.firstName).toBe('Ivan');

    const playerUpdateResponse = await request(app.getHttpServer())
      .patch('/api/v1/player/profile/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        bio: 'Updated demo player profile',
      })
      .expect(200);

    expect(playerUpdateResponse.body.data.bio).toBe('Updated demo player profile');

    const location = await getDemoLocation();
    const partnerProfileResponse = await createPartnerProfile(
      partnerToken,
      location.cityId,
      location.districtId,
    ).expect(201);

    expect(partnerProfileResponse.body.data.verificationStatus).toBe('draft');

    const partnerUpdateResponse = await request(app.getHttpServer())
      .patch('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        description: 'Updated indoor club',
      })
      .expect(200);

    expect(partnerUpdateResponse.body.data.description).toBe('Updated indoor club');

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    expect(submitResponse.body.data.status).toBe('submitted');

    const adminToken = await demoLogin('demo-admin');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests?status=submitted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.length).toBeGreaterThan(0);

    const createdRequest = listResponse.body.data.find(
      (item: any) => item.partnerProfile.ownerUser.phone === '+79990000002',
    );

    expect(createdRequest).toBeDefined();

    const detailsResponse = await request(app.getHttpServer())
      .get(`/api/v1/admin/verification-requests/${createdRequest.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailsResponse.body.data.status).toBe('submitted');

    const approveResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${createdRequest.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Looks good.',
      })
      .expect(201);

    expect(approveResponse.body.data.status).toBe('approved');

    const partnerProfileAfterApproval = await request(app.getHttpServer())
      .get('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(partnerProfileAfterApproval.body.data.verificationStatus).toBe('verified');
  });

  it('lets a partner create a venue, update it and manage courts', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);

    const createVenueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'North Court Arena',
        description: 'Main venue',
        contactPhone: '+79990000002',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Lenina 10',
        accessNotes: 'Main entrance',
      })
      .expect(201);

    expect(createVenueResponse.body.data.name).toBe('North Court Arena');
    expect(createVenueResponse.body.data.address.line1).toBe('Lenina 10');

    const venueId = createVenueResponse.body.data.id as string;

    const updateVenueResponse = await request(app.getHttpServer())
      .patch(`/api/v1/partner/venues/${venueId}`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        description: 'Updated venue description',
        contactEmail: 'arena@example.com',
        line1: 'Lenina 12',
        isActive: false,
      })
      .expect(200);

    expect(updateVenueResponse.body.data.description).toBe('Updated venue description');
    expect(updateVenueResponse.body.data.address.line1).toBe('Lenina 12');
    expect(updateVenueResponse.body.data.isActive).toBe(false);

    const createCourtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueId}/courts`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Court 1',
        surfaceType: 'hard',
        isIndoor: true,
        hasLighting: true,
        sortOrder: 1,
        isActive: true,
      })
      .expect(201);

    expect(createCourtResponse.body.data.surfaceType).toBe('hard');

    const courtId = createCourtResponse.body.data.id as string;

    const updateCourtResponse = await request(app.getHttpServer())
      .patch(`/api/v1/partner/venues/${venueId}/courts/${courtId}`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Center Court',
        notes: 'Prime evening court',
        isActive: false,
      })
      .expect(200);

    expect(updateCourtResponse.body.data.name).toBe('Center Court');
    expect(updateCourtResponse.body.data.isActive).toBe(false);

    const listMyVenuesResponse = await request(app.getHttpServer())
      .get('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(listMyVenuesResponse.body.data).toHaveLength(1);
    expect(listMyVenuesResponse.body.data[0].courts).toHaveLength(1);
    expect(listMyVenuesResponse.body.data[0].courts[0].name).toBe('Center Court');
  });

  it('shows only verified and active partner venues in the public catalog', async () => {
    const location = await getDemoLocation();
    const reviewPartnerToken = await demoLogin('review-partner');

    const pendingVenueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${reviewPartnerToken}`)
      .send({
        name: 'Pending Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Embankment 5',
      })
      .expect(201);

    const partnerToken = await demoLogin('demo-partner');
    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const adminToken = await demoLogin('demo-admin');
    await approveVerificationRequestForPhone(adminToken, '+79990000002');

    const verifiedVenueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Verified Venue',
        isActive: true,
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Prospekt Mira 20',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${verifiedVenueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Public Court',
        surfaceType: 'hard',
        isActive: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${verifiedVenueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Hidden Court',
        surfaceType: 'clay',
        isActive: false,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Inactive Verified Venue',
        isActive: false,
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Hidden Street 7',
      })
      .expect(201);

    const publicListResponse = await request(app.getHttpServer()).get('/api/v1/venues').expect(200);

    const publicVenueNames = publicListResponse.body.data.map((item: any) => item.name);

    expect(publicVenueNames).toContain('Verified Venue');
    expect(publicVenueNames).not.toContain('Pending Venue');
    expect(publicVenueNames).not.toContain('Inactive Verified Venue');

    const publicVenueDetailsResponse = await request(app.getHttpServer())
      .get(`/api/v1/venues/${verifiedVenueResponse.body.data.id}`)
      .expect(200);

    expect(publicVenueDetailsResponse.body.data.courts).toHaveLength(1);
    expect(publicVenueDetailsResponse.body.data.courts[0].name).toBe('Public Court');

    const hiddenPendingVenueResponse = await request(app.getHttpServer())
      .get(`/api/v1/venues/${pendingVenueResponse.body.data.id}`)
      .expect(404);

    expect(hiddenPendingVenueResponse.body.error.code).toBe('VENUE_NOT_FOUND');
  });

  it('does not allow a user without partner profile to create a venue', async () => {
    const adminToken = await demoLogin('demo-admin');
    const location = await getDemoLocation();

    const response = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Forbidden Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Test street 1',
      })
      .expect(404);

    expect(response.body.error.code).toBe('PARTNER_PROFILE_NOT_FOUND');
  });

  it('does not allow a partner to manage another partner venue or courts', async () => {
    const location = await getDemoLocation();
    const ownerToken = await demoLogin('demo-partner');
    const otherPartnerToken = await demoLogin('review-partner');

    await createPartnerProfile(ownerToken, location.cityId, location.districtId).expect(201);

    const venueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Owner Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Owner street 1',
      })
      .expect(201);

    const venueId = venueResponse.body.data.id as string;

    const patchResponse = await request(app.getHttpServer())
      .patch(`/api/v1/partner/venues/${venueId}`)
      .set('Authorization', `Bearer ${otherPartnerToken}`)
      .send({
        description: 'Should not work',
      })
      .expect(404);

    expect(patchResponse.body.error.code).toBe('VENUE_NOT_FOUND');

    const createCourtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueId}/courts`)
      .set('Authorization', `Bearer ${otherPartnerToken}`)
      .send({
        name: 'Hijacked Court',
        surfaceType: 'hard',
      })
      .expect(404);

    expect(createCourtResponse.body.error.code).toBe('VENUE_NOT_FOUND');
  });

  it('validates venue and court payloads and handles unknown ids', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);

    const invalidVenueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Broken Venue',
        contactEmail: 'not-an-email',
        cityId: location.cityId,
        districtId: location.districtId,
      })
      .expect(400);

    expect(invalidVenueResponse.body.error.code).toBe('VALIDATION_ERROR');

    const venueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Valid Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Valid street 8',
      })
      .expect(201);

    const invalidCourtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Broken Court',
        surfaceType: 'hard',
        sortOrder: -1,
      })
      .expect(400);

    expect(invalidCourtResponse.body.error.code).toBe('VALIDATION_ERROR');

    const unknownVenueResponse = await request(app.getHttpServer())
      .patch('/api/v1/partner/venues/2e8ae8ce-ffff-4b2f-b4f9-111111111111')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        description: 'Unknown',
      })
      .expect(404);

    expect(unknownVenueResponse.body.error.code).toBe('VENUE_NOT_FOUND');

    const unknownCourtResponse = await request(app.getHttpServer())
      .patch(
        `/api/v1/partner/venues/${venueResponse.body.data.id}/courts/2e8ae8ce-ffff-4b2f-b4f9-111111111111`,
      )
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        name: 'Unknown court',
      })
      .expect(404);

    expect(unknownCourtResponse.body.error.code).toBe('COURT_NOT_FOUND');
  });

  it('lets a partner manage court schedules and exposes availability', async () => {
    const { partnerToken, courtId } = await prepareVerifiedInventory();

    const templateResponse = await createScheduleTemplate(partnerToken, courtId, {
      weekday: 2,
      timeFrom: '10:00',
      timeTo: '12:00',
      slotDurationMinutes: 60,
      basePrice: 1800,
    }).expect(201);

    expect(templateResponse.body.data.weekday).toBe(2);
    expect(Number(templateResponse.body.data.basePrice)).toBe(1800);

    const exceptionResponse = await createScheduleException(partnerToken, courtId, {
      exceptionType: 'custom_price',
      timeFrom: '18:00',
      timeTo: '19:30',
      customPrice: 2500,
      comment: 'Prime time',
    }).expect(201);

    expect(exceptionResponse.body.data.exceptionType).toBe('custom_price');

    const templatesListResponse = await request(app.getHttpServer())
      .get(`/api/v1/partner/courts/${courtId}/schedule-templates`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(templatesListResponse.body.data.length).toBe(2);

    const availabilityResponse = await request(app.getHttpServer())
      .get(`/api/v1/courts/${courtId}/availability?date=2026-04-20`)
      .expect(200);

    expect(availabilityResponse.body.data.isAvailable).toBe(true);
    expect(availabilityResponse.body.data.intervals).toHaveLength(1);
    expect(availabilityResponse.body.data.intervals[0].timeFrom).toBe('18:00');
    expect(availabilityResponse.body.data.intervals[0].timeTo).toBe('19:30');
    expect(Number(availabilityResponse.body.data.intervals[0].price)).toBe(2500);
  });

  it('does not allow a non-owner to manage foreign court schedules', async () => {
    const { courtId } = await prepareVerifiedInventory();
    const foreignPartnerToken = await demoLogin('review-partner');

    const createResponse = await createScheduleTemplate(foreignPartnerToken, courtId).expect(404);
    expect(createResponse.body.error.code).toBe('COURT_NOT_FOUND');

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/partner/courts/${courtId}/schedule-templates`)
      .set('Authorization', `Bearer ${foreignPartnerToken}`)
      .expect(404);

    expect(listResponse.body.error.code).toBe('COURT_NOT_FOUND');
  });

  it('validates schedule payloads and unknown schedule ids', async () => {
    const { partnerToken, courtId } = await prepareVerifiedInventory();

    const invalidTemplateResponse = await createScheduleTemplate(partnerToken, courtId, {
      timeFrom: '20:00',
      timeTo: '19:00',
    }).expect(400);

    expect(invalidTemplateResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidExceptionResponse = await createScheduleException(partnerToken, courtId, {
      exceptionType: 'custom_hours',
      timeFrom: '21:00',
      timeTo: '19:00',
    }).expect(400);

    expect(invalidExceptionResponse.body.error.code).toBe('VALIDATION_ERROR');

    const unknownTemplateResponse = await request(app.getHttpServer())
      .patch(
        `/api/v1/partner/courts/${courtId}/schedule-templates/2e8ae8ce-ffff-4b2f-b4f9-111111111111`,
      )
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        timeFrom: '09:00',
      })
      .expect(404);

    expect(unknownTemplateResponse.body.error.code).toBe('COURT_SCHEDULE_TEMPLATE_NOT_FOUND');

    const unknownExceptionResponse = await request(app.getHttpServer())
      .delete(
        `/api/v1/partner/courts/${courtId}/schedule-exceptions/2e8ae8ce-ffff-4b2f-b4f9-111111111111`,
      )
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(404);

    expect(unknownExceptionResponse.body.error.code).toBe('COURT_SCHEDULE_EXCEPTION_NOT_FOUND');
  });

  it('lets a player create a booking request and a partner confirm it with history', async () => {
    const { partnerToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');

    await createPlayerProfile(playerToken).expect(201);

    const createBookingResponse = await createBookingRequest(playerToken, venueId, courtId).expect(201);
    expect(createBookingResponse.body.data.status).toBe('pending');
    expect(createBookingResponse.body.data.durationMinutes).toBe(90);

    const partnerListResponse = await request(app.getHttpServer())
      .get('/api/v1/partner/booking-requests')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(partnerListResponse.body.data).toHaveLength(1);
    expect(partnerListResponse.body.data[0].status).toBe('pending');

    const confirmResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/booking-requests/${createBookingResponse.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        commentFromPartner: 'See you on court',
      })
      .expect(201);

    expect(confirmResponse.body.data.status).toBe('confirmed');
    expect(confirmResponse.body.data.commentFromPartner).toBe('See you on court');

    const playerDetailsResponse = await request(app.getHttpServer())
      .get(`/api/v1/booking-requests/${createBookingResponse.body.data.id}`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(playerDetailsResponse.body.data.status).toBe('confirmed');
    expect(playerDetailsResponse.body.data.statusHistory).toHaveLength(2);
    expect(playerDetailsResponse.body.data.statusHistory[0].oldStatus).toBe('draft');
    expect(playerDetailsResponse.body.data.statusHistory[0].newStatus).toBe('pending');
    expect(playerDetailsResponse.body.data.statusHistory[1].oldStatus).toBe('pending');
    expect(playerDetailsResponse.body.data.statusHistory[1].newStatus).toBe('confirmed');

    const playerListResponse = await request(app.getHttpServer())
      .get('/api/v1/booking-requests/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(playerListResponse.body.data[0].status).toBe('confirmed');
  });

  it('returns 403 when a non-player tries to create a booking request', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const adminToken = await demoLogin('demo-admin');

    const response = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        venueId,
        courtId,
        bookingDate: '2026-04-20',
        timeFrom: '18:00',
        timeTo: '19:00',
        playersCount: 2,
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('does not allow another partner to confirm a foreign booking request', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    const foreignPartnerToken = await demoLogin('review-partner');

    await createPlayerProfile(playerToken).expect(201);
    const bookingResponse = await createBookingRequest(playerToken, venueId, courtId).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/partner/booking-requests/${bookingResponse.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${foreignPartnerToken}`)
      .send({
        commentFromPartner: 'Not your venue',
      })
      .expect(404);

    expect(response.body.error.code).toBe('BOOKING_REQUEST_NOT_FOUND');
  });

  it('validates court to venue relation when creating a booking request', async () => {
    const inventory = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    const secondVenueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${inventory.partnerToken}`)
      .send({
        name: 'Second Venue',
        cityId: inventory.location.cityId,
        districtId: inventory.location.districtId,
        line1: 'Second street 3',
      })
      .expect(201);

    const secondCourtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${secondVenueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${inventory.partnerToken}`)
      .send({
        name: 'Second Court',
        surfaceType: 'clay',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        venueId: inventory.venueId,
        courtId: secondCourtResponse.body.data.id,
        bookingDate: '2026-04-20',
        timeFrom: '18:00',
        timeTo: '19:00',
        playersCount: 2,
      })
      .expect(400);

    expect(response.body.error.code).toBe('BOOKING_REQUEST_INVALID_VENUE_COURT');
  });

  it('does not allow booking outside the configured schedule', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        venueId,
        courtId,
        bookingDate: '2026-04-20',
        timeFrom: '17:00',
        timeTo: '18:00',
        playersCount: 2,
      })
      .expect(409);

    expect(response.body.error.code).toBe('BOOKING_REQUEST_UNAVAILABLE_COURT');
  });

  it('does not allow booking on a closed exception date', async () => {
    const { partnerToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    await createScheduleException(partnerToken, courtId, {
      exceptionType: 'closed',
      date: '2026-04-20',
      timeFrom: undefined,
      timeTo: undefined,
      comment: 'Closed day',
    }).expect(201);

    const response = await createBookingRequest(playerToken, venueId, courtId).expect(409);
    expect(response.body.error.code).toBe('BOOKING_REQUEST_UNAVAILABLE_COURT');
  });

  it('does not allow booking on a blocked interval', async () => {
    const { partnerToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    await createScheduleException(partnerToken, courtId, {
      exceptionType: 'blocked',
      date: '2026-04-20',
      timeFrom: '18:00',
      timeTo: '19:30',
      comment: 'Blocked interval',
    }).expect(201);

    const response = await createBookingRequest(playerToken, venueId, courtId).expect(409);
    expect(response.body.error.code).toBe('BOOKING_REQUEST_UNAVAILABLE_COURT');
  });

  it('does not allow conflicting booking requests for the same court and time', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const firstPlayerToken = await demoLogin('demo-player');
    const secondPlayerToken = await demoLogin('demo-partner');

    await createPlayerProfile(firstPlayerToken, 'First', 'Player').expect(201);
    await createPlayerProfile(secondPlayerToken, 'Second', 'Player').expect(201);

    await createBookingRequest(firstPlayerToken, venueId, courtId).expect(201);

    const conflictResponse = await createBookingRequest(secondPlayerToken, venueId, courtId).expect(
      409,
    );

    expect(conflictResponse.body.error.code).toBe('BOOKING_REQUEST_UNAVAILABLE_COURT');
  });

  it('prevents invalid booking status transitions', async () => {
    const { partnerToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    const bookingResponse = await createBookingRequest(playerToken, venueId, courtId).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/partner/booking-requests/${bookingResponse.body.data.id}/reject`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        commentFromPartner: 'No slots',
      })
      .expect(201);

    const invalidTransitionResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/booking-requests/${bookingResponse.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        commentFromPartner: 'Trying to reopen',
      })
      .expect(409);

    expect(invalidTransitionResponse.body.error.code).toBe('BOOKING_REQUEST_INVALID_TRANSITION');
  });

  it('does not allow another player to cancel a foreign booking request', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const ownerPlayerToken = await demoLogin('demo-player');
    const foreignPlayerToken = await demoLogin('demo-partner');

    await createPlayerProfile(ownerPlayerToken, 'Owner', 'Player').expect(201);
    await createPlayerProfile(foreignPlayerToken, 'Foreign', 'Player').expect(201);

    const bookingResponse = await createBookingRequest(ownerPlayerToken, venueId, courtId).expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/booking-requests/${bookingResponse.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${foreignPlayerToken}`)
      .send({})
      .expect(404);

    expect(response.body.error.code).toBe('BOOKING_REQUEST_NOT_FOUND');
  });

  it('returns 404 for an unknown booking request id', async () => {
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/booking-requests/2e8ae8ce-ffff-4b2f-b4f9-111111111111')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('BOOKING_REQUEST_NOT_FOUND');
  });

  it('returns 403 for non-admin access to admin endpoints', async () => {
    const playerToken = await demoLogin('demo-player');

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when reject is sent without comment', async () => {
    const adminToken = await demoLogin('demo-admin');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests?status=submitted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const requestId = listResponse.body.data[0].id;

    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${requestId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for an unknown verification request', async () => {
    const adminToken = await demoLogin('demo-admin');

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests/2e8ae8ce-ffff-4b2f-b4f9-111111111111')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('VERIFICATION_REQUEST_NOT_FOUND');
  });

  it('returns 409 for duplicate finalized review action', async () => {
    const adminToken = await demoLogin('demo-admin');

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests?status=submitted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const requestId = listResponse.body.data[0].id;

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Approved on first pass.',
      })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Trying again.',
      })
      .expect(409);

    expect(duplicateResponse.body.error.code).toBe('VERIFICATION_REQUEST_ALREADY_FINALIZED');
  });

  it('returns a conflict for duplicate active verification submission', async () => {
    const partnerToken = await demoLogin('review-partner');

    const response = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(409);

    expect(response.body.error.code).toBe('VERIFICATION_REQUEST_ALREADY_PENDING');
  });
});
