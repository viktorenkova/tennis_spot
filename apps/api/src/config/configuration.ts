import { join } from 'node:path';

export const envFilePaths = [join(process.cwd(), '.env'), join(process.cwd(), '../../.env')];

export const configuration = () => ({
  app: {
    port: Number(process.env.API_PORT ?? 4000),
    prefix: process.env.API_PREFIX ?? 'api/v1',
    url: process.env.API_URL ?? 'http://localhost:4000',
    frontendUrl: process.env.APP_URL ?? 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/tennis_spot?schema=public',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
    phoneCodeTtlMinutes: Number(process.env.AUTH_PHONE_CODE_TTL_MINUTES ?? 10),
    phoneCodeLength: Number(process.env.AUTH_PHONE_CODE_LENGTH ?? 4),
    returnDevCode: process.env.AUTH_DEV_RETURN_CODE === 'true',
    enableDemoLogin: process.env.AUTH_ENABLE_DEMO_LOGIN !== 'false',
  },
});
