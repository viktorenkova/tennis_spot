import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { InMemoryPrismaService } from './in-memory-prisma';

describe('P1 review slice (e2e)', () => {
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

  it('runs the happy path from demo auth to admin approval', async () => {
    const partnerToken = await demoLogin('demo-partner');

    const playerProfileResponse = await request(app.getHttpServer())
      .post('/api/v1/player/profile')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        firstName: 'Ivan',
        lastName: 'Petrov',
        bio: 'Demo player profile',
        ntrpSelfRating: 3.5,
      })
      .expect(201);

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

    const partnerProfileResponse = await request(app.getHttpServer())
      .post('/api/v1/partner/profile')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({
        legalName: 'North Court LLC',
        brandName: 'North Court',
        description: 'Indoor club',
        partnerTypes: ['club'],
      })
      .expect(201);

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
