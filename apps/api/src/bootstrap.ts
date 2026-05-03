import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import type {
  CorsOptions,
  CorsOptionsCallback,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request } from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

function formatValidationErrors(errors: ValidationError[]) {
  const fields: Record<string, string[]> = {};

  const collect = (currentErrors: ValidationError[], parentPath?: string) => {
    for (const error of currentErrors) {
      const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        fields[propertyPath] = Object.values(error.constraints);
      }

      if (error.children?.length) {
        collect(error.children, propertyPath);
      }
    }
  };

  collect(errors);

  return fields;
}

function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function getHeaderValues(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((currentValue) => currentValue.split(','))
    .map((currentValue) => currentValue.trim())
    .filter(Boolean);
}

function isSameHostOrigin(origin: string, request: Request) {
  let originUrl: URL;

  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
    return false;
  }

  const requestHosts = new Set([
    ...getHeaderValues(request.headers.host),
    ...getHeaderValues(request.headers['x-forwarded-host']),
  ]);

  return requestHosts.has(originUrl.host);
}

export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.prefix', 'api/v1');
  const allowedOrigins = Array.from(
    new Set([
      normalizeOrigin(configService.get<string>('app.frontendUrl', 'http://localhost:3000')),
      normalizeOrigin(configService.get<string>('app.url')),
      normalizeOrigin(process.env.NEXT_PUBLIC_API_URL),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].filter((origin): origin is string => Boolean(origin))),
  );
  const isAllowedDevOrigin = (origin: string) => {
    try {
      const url = new URL(origin);
      const localHostnames = ['localhost', '127.0.0.1', '::1'];
      const privateNetworkPattern = /^(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/;

      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.port === '3000' &&
        (localHostnames.includes(url.hostname) || privateNetworkPattern.test(url.hostname))
      );
    } catch {
      return false;
    }
  };

  app.setGlobalPrefix(apiPrefix);
  const corsOptionsForRequest = (request: Request, callback: CorsOptionsCallback) => {
    const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
    const normalizedOrigin = normalizeOrigin(origin);
    const options: CorsOptions = {
      credentials: true,
      origin: false,
    };

    if (
      !normalizedOrigin ||
      allowedOrigins.includes(normalizedOrigin) ||
      isAllowedDevOrigin(normalizedOrigin) ||
      isSameHostOrigin(normalizedOrigin, request)
    ) {
      callback(null, {
        ...options,
        origin: true,
      });
      return;
    }

    callback(new Error(`Origin ${normalizedOrigin} is not allowed by CORS.`), options);
  };

  app.enableCors(corsOptionsForRequest);
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации запроса.',
          fields: formatValidationErrors(errors),
        }),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('tennis_spot API')
    .setDescription('REST API MVP-платформы tennis_spot.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument);

  return {
    apiPrefix,
    port: configService.get<number>('app.port', 4000),
  };
}
