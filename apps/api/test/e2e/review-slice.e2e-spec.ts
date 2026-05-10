import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { InMemoryPrismaService } from './in-memory-prisma';

describe('P1 review and booking slices (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_TTL = '30d';
    process.env.AUTH_ENABLE_DEMO_LOGIN = 'true';
    process.env.AUTH_DEV_RETURN_CODE = 'true';
  });

  beforeEach(async () => {
    prisma = new InMemoryPrismaService();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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

  async function phoneLogin(phone: string) {
    const requestCodeResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/phone/request-code')
      .send({ phone })
      .expect(201);

    expect(requestCodeResponse.body.data.challengeId).toBeDefined();
    expect(requestCodeResponse.body.data.code).toBeDefined();

    const verifyCodeResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/phone/verify-code')
      .send({
        phone,
        challengeId: requestCodeResponse.body.data.challengeId,
        code: requestCodeResponse.body.data.code,
      })
      .expect(201);

    expect(verifyCodeResponse.body.data.accessToken).toBeDefined();

    return verifyCodeResponse.body.data.accessToken as string;
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

  function updatePlayerAvatar(
    accessToken: string,
    overrides: Partial<{
      originalName: string;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/player/profile/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        originalName: 'avatar.png',
        storageKey: `avatars/${Date.now()}-avatar.png`,
        mimeType: 'image/png',
        sizeBytes: 2048,
        ...overrides,
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

  async function selectOnboardingRole(accessToken: string, mode: 'player' | 'partner') {
    const response = await request(app.getHttpServer())
      .post('/api/v1/user/onboarding/role')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mode })
      .expect(201);

    return response.body.data.roles.map((item: any) => item.role.key).sort() as string[];
  }

  function addVerificationDocument(
    accessToken: string,
    overrides: Partial<{
      documentType: string;
      originalName: string;
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/partner/verification/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        documentType: 'registration_certificate',
        originalName: 'registration.pdf',
        storageKey: `demo/${Date.now()}-registration.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        ...overrides,
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
    await addVerificationDocument(partnerToken).expect(201);

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

  function createBookingFromMatchRequest(
    accessToken: string,
    matchRequestId: string,
    venueId: string,
    courtId: string,
  ) {
    return request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchRequestId}/create-booking`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        venueId,
        courtId,
        commentFromPlayer: 'Booking for accepted challenge',
      });
  }

  function createMatchRequest(
    accessToken: string,
    opponentId: string,
    overrides: Partial<{
      proposedDate: string;
      proposedTimeFrom: string;
      proposedTimeTo: string;
      format: 'singles' | 'doubles';
      message: string;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/match-requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        opponentId,
        proposedDate: '2099-04-20',
        proposedTimeFrom: '18:00',
        proposedTimeTo: '19:30',
        format: 'singles',
        message: 'Friendly match?',
        ...overrides,
      });
  }

  function getNotifications(accessToken: string) {
    return request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  function getUnreadCount(accessToken: string) {
    return request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`);
  }

  function createComplaint(
    accessToken: string,
    overrides: Partial<{
      type: 'no_show' | 'late_cancel' | 'bad_behavior' | 'court_issue' | 'other';
      description: string;
      targetUserId: string;
      relatedBookingRequestId: string;
      relatedMatchRequestId: string;
    }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/complaints')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'late_cancel',
        description: 'Партнёр отменил игру слишком поздно, прошу проверить ситуацию.',
        ...overrides,
      });
  }

  it('returns implemented enum values from the reference endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/reference/enums').expect(200);

    expect(response.body.data.matchRequestStatus).toEqual([
      'pending',
      'accepted',
      'declined',
      'cancelled',
    ]);
    expect(response.body.data.bookingRequestStatus).toEqual([
      'draft',
      'pending',
      'confirmed',
      'rejected',
      'cancelled_by_player',
      'cancelled_by_partner',
      'expired',
      'completed',
    ]);
    expect(response.body.data.verificationRequestStatus).toEqual([
      'draft',
      'submitted',
      'in_review',
      'approved',
      'rejected',
      'needs_correction',
    ]);
    expect(response.body.data.notificationType).toEqual(
      expect.arrayContaining([
        'verification_submitted',
        'booking_created',
        'match_request_created',
        'match_booking_created',
      ]),
    );
    expect(response.body.data).not.toHaveProperty('tournamentStatus');
    expect(response.body.data).not.toHaveProperty('tournamentRegistrationStatus');
  });

  it('lets a public phone user choose the player scenario', async () => {
    const token = await phoneLogin('+79991234567');
    const roles = await selectOnboardingRole(token, 'player');

    expect(roles).toEqual(['player']);
  });

  it('lets a public phone user choose the partner scenario without auto-verification', async () => {
    const token = await phoneLogin('+79991234568');
    const roles = await selectOnboardingRole(token, 'partner');
    const location = await getDemoLocation();

    expect(roles).toEqual(['partner', 'player']);

    const profileResponse = await createPartnerProfile(
      token,
      location.cityId,
      location.districtId,
    ).expect(201);

    expect(profileResponse.body.data.verificationStatus).toBe('draft');
  });

  it('does not allow public onboarding to grant admin roles', async () => {
    const token = await phoneLogin('+79991234569');

    const response = await request(app.getHttpServer())
      .post('/api/v1/user/onboarding/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'admin' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const roles = meResponse.body.data.roles.map((item: any) => item.role.key);
    expect(roles).not.toContain('admin');
    expect(roles).not.toContain('superadmin');
  });

  it('rejects an access token when the user is no longer active', async () => {
    const phone = '+79991234571';
    const token = await phoneLogin(phone);

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await prisma.user.update({
      where: {
        id: meResponse.body.data.id,
      },
      data: {
        status: 'blocked',
      },
    });

    const blockedResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(blockedResponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('keeps unverified partner venues out of public catalog and booking discovery', async () => {
    const token = await phoneLogin('+79991234570');
    await selectOnboardingRole(token, 'partner');

    const location = await getDemoLocation();
    const profileResponse = await createPartnerProfile(
      token,
      location.cityId,
      location.districtId,
    ).expect(201);

    expect(profileResponse.body.data.verificationStatus).toBe('draft');

    const venueResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/venues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unverified Public Beta Venue',
        cityId: location.cityId,
        districtId: location.districtId,
        line1: 'Beta lane 1',
        isActive: true,
      })
      .expect(201);

    const courtResponse = await request(app.getHttpServer())
      .post(`/api/v1/partner/venues/${venueResponse.body.data.id}/courts`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Court Beta',
        surfaceType: 'hard',
        isIndoor: true,
        hasLighting: true,
        isActive: true,
      })
      .expect(201);

    await createScheduleTemplate(token, courtResponse.body.data.id).expect(201);

    const publicVenuesResponse = await request(app.getHttpServer())
      .get('/api/v1/venues')
      .expect(200);

    expect(publicVenuesResponse.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: venueResponse.body.data.id,
        }),
      ]),
    );

    const bookingOptionsResponse = await request(app.getHttpServer())
      .get('/api/v1/booking-requests/options')
      .query({
        cityId: location.cityId,
        bookingDate: '2026-04-20',
        timeFrom: '18:00',
        timeTo: '19:30',
      })
      .expect(200);

    expect(bookingOptionsResponse.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          venue: expect.objectContaining({
            id: venueResponse.body.data.id,
          }),
        }),
      ]),
    );
  });

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

    await addVerificationDocument(partnerToken).expect(201);

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

  it('lets a player attach avatar metadata to their profile', async () => {
    const playerToken = await phoneLogin('+79990001010');
    await createPlayerProfile(playerToken, 'Avatar', 'Player').expect(201);

    const avatarResponse = await updatePlayerAvatar(playerToken, {
      originalName: 'avatar.webp',
      storageKey: 'avatars/player-avatar.webp',
      mimeType: 'image/webp',
      sizeBytes: 4096,
    }).expect(201);

    expect(avatarResponse.body.success).toBe(true);
    expect(avatarResponse.body.data.avatarFileId).toBeDefined();
    expect(avatarResponse.body.data.avatarFile).toEqual(
      expect.objectContaining({
        originalName: 'avatar.webp',
        storageBucket: 'pending',
        storageKey: 'avatars/player-avatar.webp',
        mimeType: 'image/webp',
        sizeBytes: 4096,
      }),
    );

    const profileResponse = await request(app.getHttpServer())
      .get('/api/v1/player/profile/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(profileResponse.body.data.avatarFile).toEqual(
      expect.objectContaining({
        id: avatarResponse.body.data.avatarFileId,
        storageKey: 'avatars/player-avatar.webp',
      }),
    );
  });

  it('creates verification notifications and supports read actions', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const adminToken = await demoLogin('demo-admin');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);
    await addVerificationDocument(partnerToken).expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const adminNotificationsResponse = await getNotifications(adminToken).expect(200);
    expect(adminNotificationsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'verification_submitted',
          relatedEntityType: 'verification_request',
          relatedEntityId: submitResponse.body.data.id,
          isRead: false,
        }),
      ]),
    );

    const adminUnreadCountResponse = await getUnreadCount(adminToken).expect(200);
    expect(adminUnreadCountResponse.body.data.count).toBeGreaterThanOrEqual(1);

    const notificationId = adminNotificationsResponse.body.data.find(
      (item: any) => item.relatedEntityId === submitResponse.body.data.id,
    ).id;

    const readResponse = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    expect(readResponse.body.data.isRead).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${submitResponse.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Approved.',
      })
      .expect(201);

    const partnerNotificationsResponse = await getNotifications(partnerToken).expect(200);
    expect(partnerNotificationsResponse.body.data[0]).toMatchObject({
      type: 'verification_approved',
      relatedEntityType: 'verification_request',
      relatedEntityId: submitResponse.body.data.id,
      isRead: false,
    });

    const readAllResponse = await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    expect(readAllResponse.body.data.updatedCount).toBeGreaterThanOrEqual(1);

    const partnerUnreadCountResponse = await getUnreadCount(partnerToken).expect(200);
    expect(partnerUnreadCountResponse.body.data.count).toBe(0);
  });

  it('requires at least one document before verification submission', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(409);

    expect(response.body.error.code).toBe('VERIFICATION_REQUEST_DOCUMENT_REQUIRED');
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
    const pendingPartnerProfileResponse = await request(app.getHttpServer())
      .get('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${reviewPartnerToken}`)
      .expect(200);

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
    const partnerProfileResponse = await createPartnerProfile(
      partnerToken,
      location.cityId,
      location.districtId,
    ).expect(201);
    await addVerificationDocument(partnerToken).expect(201);

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

    const hiddenPendingPartnerResponse = await request(app.getHttpServer())
      .get(`/api/v1/partners/${pendingPartnerProfileResponse.body.data.id}`)
      .expect(404);

    expect(hiddenPendingPartnerResponse.body.error.code).toBe('NOT_FOUND');

    const publicPartnerResponse = await request(app.getHttpServer())
      .get(`/api/v1/partners/${partnerProfileResponse.body.data.id}`)
      .expect(200);

    expect(publicPartnerResponse.body.data.verificationStatus).toBe('verified');
    expect(publicPartnerResponse.body.data.taxId).toBeUndefined();
    expect(publicPartnerResponse.body.data.legalAddress).toBeUndefined();
    expect(publicPartnerResponse.body.data.actualAddress).toBeUndefined();
    expect(publicPartnerResponse.body.data.ownerUserId).toBeUndefined();
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

    const sundayTemplateResponse = await createScheduleTemplate(partnerToken, courtId, {
      weekday: 0,
      timeFrom: '08:00',
      timeTo: '09:00',
      slotDurationMinutes: 60,
    }).expect(201);

    expect(sundayTemplateResponse.body.data.weekday).toBe(0);

    const updatedTemplateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/schedule-templates/${templateResponse.body.data.id}`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        basePrice: 1900,
      })
      .expect(200);

    expect(Number(updatedTemplateResponse.body.data.basePrice)).toBe(1900);

    const exceptionResponse = await createScheduleException(partnerToken, courtId, {
      exceptionType: 'custom_price',
      timeFrom: '18:00',
      timeTo: '19:30',
      customPrice: 2500,
      comment: 'Prime time',
    }).expect(201);

    expect(exceptionResponse.body.data.exceptionType).toBe('custom_price');

    const updatedExceptionResponse = await request(app.getHttpServer())
      .patch(`/api/v1/schedule-exceptions/${exceptionResponse.body.data.id}`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        comment: 'Prime time updated',
      })
      .expect(200);

    expect(updatedExceptionResponse.body.data.comment).toBe('Prime time updated');

    const templatesListResponse = await request(app.getHttpServer())
      .get(`/api/v1/partner/courts/${courtId}/schedule-templates`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(templatesListResponse.body.data.length).toBe(3);

    const availabilityResponse = await request(app.getHttpServer())
      .get(`/api/v1/courts/${courtId}/availability?date=2026-04-20`)
      .expect(200);

    expect(availabilityResponse.body.data.isAvailable).toBe(true);
    expect(availabilityResponse.body.data.intervals).toHaveLength(1);
    expect(availabilityResponse.body.data.intervals[0].timeFrom).toBe('18:00');
    expect(availabilityResponse.body.data.intervals[0].timeTo).toBe('19:30');
    expect(Number(availabilityResponse.body.data.intervals[0].price)).toBe(2500);

    const sundayAvailabilityResponse = await request(app.getHttpServer())
      .get(`/api/v1/courts/${courtId}/availability?date=2026-04-19`)
      .expect(200);

    expect(sundayAvailabilityResponse.body.data.intervals[0].timeFrom).toBe('08:00');
    expect(sundayAvailabilityResponse.body.data.intervals[0].timeTo).toBe('09:00');
  });

  it('returns matching booking options by filters and excludes unavailable courts', async () => {
    const { partnerToken, location, courtId } = await prepareVerifiedInventory();

    const matchingResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&districtId=${location.districtId}&bookingDate=2026-04-20&timeFrom=18:00&timeTo=19:30&surfaceType=hard&courtType=indoor&playersCount=4`,
      )
      .expect(200);

    expect(matchingResponse.body.data).toHaveLength(1);
    expect(matchingResponse.body.data[0].court.id).toBe(courtId);
    expect(matchingResponse.body.data[0].court.isIndoor).toBe(true);
    expect(matchingResponse.body.data[0].availableInterval.playersCount).toBe(4);

    const wrongCourtTypeResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=18:00&timeTo=19:30&courtType=outdoor`,
      )
      .expect(200);

    expect(wrongCourtTypeResponse.body.data).toHaveLength(0);

    await createScheduleException(partnerToken, courtId, {
      exceptionType: 'blocked',
      date: '2026-04-20',
      timeFrom: '18:00',
      timeTo: '19:30',
      comment: 'Blocked discovery interval',
    }).expect(201);

    const blockedResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=18:00&timeTo=19:30&courtType=indoor`,
      )
      .expect(200);

    expect(blockedResponse.body.data).toHaveLength(0);
  });

  it('validates booking discovery filters and returns empty state data for no matches', async () => {
    const { location } = await prepareVerifiedInventory();

    const invalidTimeResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=19:30&timeTo=18:00&playersCount=2`,
      )
      .expect(400);

    expect(invalidTimeResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidPlayersCountResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=18:00&timeTo=19:30&playersCount=10`,
      )
      .expect(400);

    expect(invalidPlayersCountResponse.body.error.code).toBe('VALIDATION_ERROR');

    const overLimitResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=18:00&timeTo=23:00&playersCount=2`,
      )
      .expect(400);

    expect(overLimitResponse.body.error.code).toBe('BOOKING_REQUEST_DURATION_LIMIT_EXCEEDED');

    const noOptionsResponse = await request(app.getHttpServer())
      .get(
        `/api/v1/booking-requests/options?cityId=${location.cityId}&bookingDate=2026-04-20&timeFrom=08:00&timeTo=09:00&playersCount=2`,
      )
      .expect(200);

    expect(noOptionsResponse.body.data).toHaveLength(0);
  });

  it('does not allow a non-owner to manage foreign court schedules', async () => {
    const { partnerToken, courtId } = await prepareVerifiedInventory();
    const foreignPartnerToken = await demoLogin('review-partner');

    const createResponse = await createScheduleTemplate(foreignPartnerToken, courtId).expect(404);
    expect(createResponse.body.error.code).toBe('COURT_NOT_FOUND');

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/partner/courts/${courtId}/schedule-templates`)
      .set('Authorization', `Bearer ${foreignPartnerToken}`)
      .expect(404);

    expect(listResponse.body.error.code).toBe('COURT_NOT_FOUND');

    const ownerTemplateResponse = await createScheduleTemplate(partnerToken, courtId, {
      weekday: 3,
      timeFrom: '12:00',
      timeTo: '13:00',
    }).expect(201);

    const flatTemplateUpdateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/schedule-templates/${ownerTemplateResponse.body.data.id}`)
      .set('Authorization', `Bearer ${foreignPartnerToken}`)
      .send({
        basePrice: 1000,
      })
      .expect(404);

    expect(flatTemplateUpdateResponse.body.error.code).toBe('COURT_NOT_FOUND');

    const ownerExceptionResponse = await createScheduleException(partnerToken, courtId, {
      date: '2026-04-22',
      exceptionType: 'blocked',
      timeFrom: '12:00',
      timeTo: '13:00',
    }).expect(201);

    const flatExceptionDeleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/schedule-exceptions/${ownerExceptionResponse.body.data.id}`)
      .set('Authorization', `Bearer ${foreignPartnerToken}`)
      .expect(404);

    expect(flatExceptionDeleteResponse.body.error.code).toBe('COURT_NOT_FOUND');
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

    const partnerNotificationsResponse = await getNotifications(partnerToken).expect(200);
    expect(partnerNotificationsResponse.body.data[0]).toMatchObject({
      type: 'booking_created',
      relatedEntityType: 'booking_request',
      relatedEntityId: createBookingResponse.body.data.id,
      isRead: false,
    });

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

    const playerNotificationsResponse = await getNotifications(playerToken).expect(200);
    expect(playerNotificationsResponse.body.data[0]).toMatchObject({
      type: 'booking_confirmed',
      relatedEntityType: 'booking_request',
      relatedEntityId: createBookingResponse.body.data.id,
      isRead: false,
    });
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

  it('rejects booking intervals longer than four hours', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    await createPlayerProfile(playerToken).expect(201);

    const overLimitBookingResponse = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        venueId,
        courtId,
        bookingDate: '2026-04-20',
        timeFrom: '18:00',
        timeTo: '23:00',
        playersCount: 2,
        commentFromPlayer: 'Long booking',
      })
      .expect(400);

    expect(overLimitBookingResponse.body.error.code).toBe(
      'BOOKING_REQUEST_DURATION_LIMIT_EXCEEDED',
    );
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

  it('lets players create and accept a match request with notifications', async () => {
    const initiatorToken = await demoLogin('demo-player');
    const opponentToken = await demoLogin('demo-partner');

    const initiatorProfileResponse = await createPlayerProfile(
      initiatorToken,
      'Initiator',
      'Player',
    ).expect(201);
    const opponentProfileResponse = await createPlayerProfile(
      opponentToken,
      'Opponent',
      'Player',
    ).expect(201);

    const playersResponse = await request(app.getHttpServer())
      .get('/api/v1/players')
      .set('Authorization', `Bearer ${initiatorToken}`)
      .expect(200);

    expect(playersResponse.body.data.map((player: any) => player.id)).toEqual(
      expect.arrayContaining([initiatorProfileResponse.body.data.id, opponentProfileResponse.body.data.id]),
    );

    const createResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
    ).expect(201);

    expect(createResponse.body.data.status).toBe('pending');
    expect(createResponse.body.data.opponent.playerProfile.firstName).toBe('Opponent');

    const opponentNotificationsResponse = await getNotifications(opponentToken).expect(200);
    expect(opponentNotificationsResponse.body.data[0]).toMatchObject({
      type: 'match_request_created',
      relatedEntityType: 'match_request',
      relatedEntityId: createResponse.body.data.id,
    });

    const incomingResponse = await request(app.getHttpServer())
      .get('/api/v1/match-requests/incoming')
      .set('Authorization', `Bearer ${opponentToken}`)
      .expect(200);

    expect(incomingResponse.body.data).toHaveLength(1);
    expect(incomingResponse.body.data[0].initiator.playerProfile.firstName).toBe('Initiator');

    const acceptResponse = await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${createResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    expect(acceptResponse.body.data.status).toBe('accepted');

    const outgoingResponse = await request(app.getHttpServer())
      .get('/api/v1/match-requests/outgoing')
      .set('Authorization', `Bearer ${initiatorToken}`)
      .expect(200);

    expect(outgoingResponse.body.data[0].status).toBe('accepted');

    const initiatorNotificationsResponse = await getNotifications(initiatorToken).expect(200);
    expect(initiatorNotificationsResponse.body.data[0]).toMatchObject({
      type: 'match_request_accepted',
      relatedEntityType: 'match_request',
      relatedEntityId: createResponse.body.data.id,
    });
  });

  it('lets a player create a booking request from an accepted match request', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const initiatorToken = await demoLogin('demo-player');
    const opponentToken = await demoLogin('demo-partner');

    await createPlayerProfile(initiatorToken, 'Initiator', 'Player').expect(201);
    const opponentProfileResponse = await createPlayerProfile(
      opponentToken,
      'Opponent',
      'Player',
    ).expect(201);

    const matchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    const bookingResponse = await createBookingFromMatchRequest(
      initiatorToken,
      matchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(201);

    expect(bookingResponse.body.data).toMatchObject({
      status: 'pending',
      relatedMatchRequestId: matchResponse.body.data.id,
      bookingDate: '2099-04-20T00:00:00.000Z',
      timeFrom: '18:00',
      timeTo: '19:30',
      playersCount: 2,
    });

    const outgoingResponse = await request(app.getHttpServer())
      .get('/api/v1/match-requests/outgoing')
      .set('Authorization', `Bearer ${initiatorToken}`)
      .expect(200);

    expect(outgoingResponse.body.data[0].relatedBookingRequest).toMatchObject({
      id: bookingResponse.body.data.id,
      status: 'pending',
    });
    expect(outgoingResponse.body.data[0].relatedBooking).toMatchObject({
      id: bookingResponse.body.data.id,
      status: 'pending',
      venueName: 'Verified Venue',
      courtName: 'Court 1',
      bookingDate: '2099-04-20',
      timeFrom: '18:00',
      timeTo: '19:30',
    });

    const opponentNotificationsResponse = await getNotifications(opponentToken).expect(200);
    expect(opponentNotificationsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'match_booking_created',
          relatedEntityType: 'booking_request',
          relatedEntityId: bookingResponse.body.data.id,
        }),
      ]),
    );

    const opponentBookingListResponse = await request(app.getHttpServer())
      .get('/api/v1/booking-requests/me')
      .set('Authorization', `Bearer ${opponentToken}`)
      .expect(200);

    expect(opponentBookingListResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: bookingResponse.body.data.id,
          relatedMatchRequestId: matchResponse.body.data.id,
        }),
      ]),
    );

    const opponentBookingDetailsResponse = await request(app.getHttpServer())
      .get(`/api/v1/booking-requests/${bookingResponse.body.data.id}`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .expect(200);

    expect(opponentBookingDetailsResponse.body.data).toMatchObject({
      id: bookingResponse.body.data.id,
      relatedMatchRequestId: matchResponse.body.data.id,
      status: 'pending',
    });
  });

  it('validates match-to-booking creation rules', async () => {
    const { venueId, courtId } = await prepareVerifiedInventory();
    const initiatorToken = await demoLogin('demo-player');
    const opponentToken = await demoLogin('demo-partner');
    const foreignToken = await demoLogin('review-partner');

    await createPlayerProfile(initiatorToken, 'Initiator', 'Player').expect(201);
    const opponentProfileResponse = await createPlayerProfile(
      opponentToken,
      'Opponent',
      'Player',
    ).expect(201);
    await createPlayerProfile(foreignToken, 'Foreign', 'Player').expect(201);

    const pendingMatchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
    ).expect(201);

    const beforeAcceptResponse = await createBookingFromMatchRequest(
      initiatorToken,
      pendingMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(409);

    expect(beforeAcceptResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_TRANSITION');

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${pendingMatchResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    const foreignResponse = await createBookingFromMatchRequest(
      foreignToken,
      pendingMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(404);

    expect(foreignResponse.body.error.code).toBe('MATCH_REQUEST_NOT_FOUND');

    await createBookingFromMatchRequest(
      initiatorToken,
      pendingMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(201);

    const duplicateResponse = await createBookingFromMatchRequest(
      initiatorToken,
      pendingMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(409);

    expect(duplicateResponse.body.error.code).toBe('MATCH_REQUEST_BOOKING_ALREADY_EXISTS');

    const declinedMatchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
      {
        proposedDate: '2099-04-21',
      },
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${declinedMatchResponse.body.data.id}/decline`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    const declinedBookingResponse = await createBookingFromMatchRequest(
      initiatorToken,
      declinedMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(409);

    expect(declinedBookingResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_TRANSITION');

    const cancelledMatchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
      {
        proposedDate: '2099-04-22',
      },
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${cancelledMatchResponse.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${initiatorToken}`)
      .send({})
      .expect(201);

    const cancelledBookingResponse = await createBookingFromMatchRequest(
      initiatorToken,
      cancelledMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(409);

    expect(cancelledBookingResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_TRANSITION');

    const unavailableMatchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
      {
        proposedDate: '2099-04-20',
      },
    ).expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${unavailableMatchResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    const unavailableBookingResponse = await createBookingFromMatchRequest(
      initiatorToken,
      unavailableMatchResponse.body.data.id,
      venueId,
      courtId,
    ).expect(409);

    expect(unavailableBookingResponse.body.error.code).toBe('BOOKING_REQUEST_UNAVAILABLE_COURT');
  });

  it('validates match request negative cases', async () => {
    const initiatorToken = await demoLogin('demo-player');
    const opponentToken = await demoLogin('demo-partner');
    const foreignToken = await demoLogin('review-partner');

    const initiatorProfileResponse = await createPlayerProfile(
      initiatorToken,
      'Initiator',
      'Player',
    ).expect(201);
    const opponentProfileResponse = await createPlayerProfile(
      opponentToken,
      'Opponent',
      'Player',
    ).expect(201);
    await createPlayerProfile(foreignToken, 'Foreign', 'Player').expect(201);

    const selfChallengeResponse = await createMatchRequest(
      initiatorToken,
      initiatorProfileResponse.body.data.userId,
    ).expect(400);

    expect(selfChallengeResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_OPPONENT');

    const invalidDateResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
      {
        proposedDate: '2020-01-01',
      },
    ).expect(400);

    expect(invalidDateResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_SCHEDULE');

    const overLimitMatchResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
      {
        proposedTimeTo: '23:00',
      },
    ).expect(400);

    expect(overLimitMatchResponse.body.error.code).toBe('BOOKING_REQUEST_DURATION_LIMIT_EXCEEDED');

    const matchRequestResponse = await createMatchRequest(
      initiatorToken,
      opponentProfileResponse.body.data.userId,
    ).expect(201);

    const unauthorizedAcceptResponse = await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchRequestResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${foreignToken}`)
      .send({})
      .expect(404);

    expect(unauthorizedAcceptResponse.body.error.code).toBe('MATCH_REQUEST_NOT_FOUND');

    await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchRequestResponse.body.data.id}/decline`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(201);

    const doubleActionResponse = await request(app.getHttpServer())
      .post(`/api/v1/match-requests/${matchRequestResponse.body.data.id}/accept`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send({})
      .expect(409);

    expect(doubleActionResponse.body.error.code).toBe('MATCH_REQUEST_INVALID_TRANSITION');
  });

  it('runs the complaints happy path with admin status review and user notification', async () => {
    const { adminToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');

    await createPlayerProfile(playerToken, 'Complaint', 'Player').expect(201);
    const bookingResponse = await createBookingRequest(playerToken, venueId, courtId).expect(201);

    const complaintResponse = await createComplaint(playerToken, {
      relatedBookingRequestId: bookingResponse.body.data.id,
      type: 'court_issue',
    }).expect(201);

    expect(complaintResponse.body.data).toMatchObject({
      type: 'court_issue',
      status: 'pending',
      relatedBookingRequestId: bookingResponse.body.data.id,
    });

    const myComplaintsResponse = await request(app.getHttpServer())
      .get('/api/v1/complaints/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(myComplaintsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: complaintResponse.body.data.id,
          status: 'pending',
        }),
      ]),
    );

    const adminNotificationsResponse = await getNotifications(adminToken).expect(200);
    expect(adminNotificationsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'complaint_created',
          relatedEntityType: 'complaint',
          relatedEntityId: complaintResponse.body.data.id,
        }),
      ]),
    );

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/complaints?status=pending&type=court_issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(adminListResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: complaintResponse.body.data.id,
          type: 'court_issue',
        }),
      ]),
    );

    const statusResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/complaints/${complaintResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved',
        resolutionComment: 'Проверили ситуацию и связались с участниками.',
      })
      .expect(201);

    expect(statusResponse.body.data).toMatchObject({
      id: complaintResponse.body.data.id,
      status: 'resolved',
      resolutionComment: 'Проверили ситуацию и связались с участниками.',
    });

    const playerNotificationsResponse = await getNotifications(playerToken).expect(200);
    expect(playerNotificationsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'complaint_status_updated',
          relatedEntityType: 'complaint',
          relatedEntityId: complaintResponse.body.data.id,
        }),
      ]),
    );
  });

  it('validates complaints negative cases', async () => {
    const { adminToken, venueId, courtId } = await prepareVerifiedInventory();
    const playerToken = await demoLogin('demo-player');
    const foreignToken = await demoLogin('review-partner');

    await createPlayerProfile(playerToken, 'Owner', 'Player').expect(201);
    await createPlayerProfile(foreignToken, 'Foreign', 'Player').expect(201);
    const bookingResponse = await createBookingRequest(playerToken, venueId, courtId).expect(201);

    const emptyDescriptionResponse = await createComplaint(playerToken, {
      description: '',
      relatedBookingRequestId: bookingResponse.body.data.id,
    }).expect(400);

    expect(emptyDescriptionResponse.body.error.code).toBe('VALIDATION_ERROR');

    const noContextResponse = await createComplaint(playerToken).expect(400);
    expect(noContextResponse.body.error.code).toBe('COMPLAINT_MISSING_CONTEXT');

    const foreignBookingResponse = await createComplaint(foreignToken, {
      relatedBookingRequestId: bookingResponse.body.data.id,
    }).expect(403);

    expect(foreignBookingResponse.body.error.code).toBe('COMPLAINT_CONTEXT_FORBIDDEN');

    const complaintResponse = await createComplaint(playerToken, {
      relatedBookingRequestId: bookingResponse.body.data.id,
    }).expect(201);

    const nonAdminStatusResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/complaints/${complaintResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({
        status: 'in_review',
      })
      .expect(403);

    expect(nonAdminStatusResponse.body.error.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .post(`/api/v1/admin/complaints/${complaintResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved',
      })
      .expect(201);

    const finalizedResponse = await request(app.getHttpServer())
      .post(`/api/v1/admin/complaints/${complaintResponse.body.data.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rejected',
      })
      .expect(409);

    expect(finalizedResponse.body.error.code).toBe('COMPLAINT_ALREADY_FINALIZED');
  });

  it('returns complete validation feedback for an empty booking request payload', async () => {
    const playerToken = await demoLogin('demo-player');

    const response = await request(app.getHttpServer())
      .post('/api/v1/booking-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toMatchObject({
      venueId: expect.any(Array),
      courtId: expect.any(Array),
      bookingDate: expect.any(Array),
      timeFrom: expect.any(Array),
      timeTo: expect.any(Array),
      playersCount: expect.any(Array),
    });
  });

  it('returns 403 for non-admin access to admin endpoints', async () => {
    const playerToken = await demoLogin('demo-player');

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/verification-requests')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('keeps demo account role baseline reproducible', async () => {
    const expectations = {
      'demo-player': ['player'],
      'demo-partner': ['partner', 'player'],
      'demo-admin': ['admin'],
      'review-partner': ['partner', 'player'],
    } as const;

    for (const [userKey, expectedRoles] of Object.entries(expectations)) {
      const token = await demoLogin(userKey as keyof typeof expectations);
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const actualRoles = response.body.data.roles
        .map((item: any) => item.role.key)
        .sort();

      expect(actualRoles).toEqual([...expectedRoles].sort());
    }
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

  it('adds documents to an active submitted verification request without creating a silent draft', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);
    await addVerificationDocument(partnerToken).expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const activeRequestId = submitResponse.body.data.id as string;
    const partnerProfileId = submitResponse.body.data.partnerProfile.id as string;

    const secondDocumentResponse = await addVerificationDocument(partnerToken, {
      documentType: 'tax_document',
      originalName: 'tax.pdf',
      storageKey: 'demo/tax-document.pdf',
    }).expect(201);

    expect(secondDocumentResponse.body.data.verificationRequestId).toBe(activeRequestId);

    const myRequestResponse = await request(app.getHttpServer())
      .get('/api/v1/partner/verification/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(myRequestResponse.body.data.id).toBe(activeRequestId);
    expect(myRequestResponse.body.data.status).toBe('submitted');
    expect(myRequestResponse.body.data.documents).toHaveLength(2);

    const requests = await prisma.verificationRequest.findMany({
      where: {
        partnerProfileId,
      },
    });

    expect(requests).toHaveLength(1);
  });

  it('returns the approved verification request even if a newer stale draft exists', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const adminToken = await demoLogin('demo-admin');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);
    await addVerificationDocument(partnerToken).expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const approvedResponse = await approveVerificationRequestForPhone(adminToken, '+79990000002');
    const partnerProfileId = submitResponse.body.data.partnerProfile.id as string;

    await prisma.verificationRequest.create({
      data: {
        partnerProfileId,
        status: 'draft',
      },
    });

    const myRequestResponse = await request(app.getHttpServer())
      .get('/api/v1/partner/verification/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(approvedResponse.body.data.status).toBe('approved');
    expect(myRequestResponse.body.data.id).toBe(approvedResponse.body.data.id);
    expect(myRequestResponse.body.data.status).toBe('approved');
  });

  it('keeps verification request and partner status consistent through needs-correction resubmission', async () => {
    const partnerToken = await demoLogin('demo-partner');
    const adminToken = await demoLogin('demo-admin');
    const location = await getDemoLocation();

    await createPartnerProfile(partnerToken, location.cityId, location.districtId).expect(201);
    await addVerificationDocument(partnerToken).expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    const requestId = submitResponse.body.data.id as string;

    await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${requestId}/needs-correction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Please upload a clearer document.',
      })
      .expect(201);

    const profileAfterCorrection = await request(app.getHttpServer())
      .get('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(profileAfterCorrection.body.data.verificationStatus).toBe('draft');

    const requestAfterCorrection = await request(app.getHttpServer())
      .get('/api/v1/partner/verification/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(requestAfterCorrection.body.data.id).toBe(requestId);
    expect(requestAfterCorrection.body.data.status).toBe('needs_correction');

    const addDocumentResponse = await addVerificationDocument(partnerToken, {
      documentType: 'charter',
      originalName: 'updated-charter.pdf',
      storageKey: 'demo/updated-charter.pdf',
    }).expect(201);

    expect(addDocumentResponse.body.data.verificationRequestId).toBe(requestId);

    const resubmitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({})
      .expect(201);

    expect(resubmitResponse.body.data.id).toBe(requestId);
    expect(resubmitResponse.body.data.status).toBe('submitted');

    const profileAfterResubmit = await request(app.getHttpServer())
      .get('/api/v1/partner/profile/me')
      .set('Authorization', `Bearer ${partnerToken}`)
      .expect(200);

    expect(profileAfterResubmit.body.data.verificationStatus).toBe('pending_verification');
  });

  it('forbids admin self-review for their own partner verification request', async () => {
    const adminToken = await demoLogin('demo-admin');
    const location = await getDemoLocation();

    await createPartnerProfile(adminToken, location.cityId, location.districtId).expect(201);
    await addVerificationDocument(adminToken).expect(201);

    const submitResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/verification/submit')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/admin/verification-requests/${submitResponse.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        comment: 'Trying to approve my own request.',
      })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
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
