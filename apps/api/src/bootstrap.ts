import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.prefix', 'api/v1');
  const allowedOrigins = Array.from(
    new Set([
      configService.get<string>('app.frontendUrl', 'http://localhost:3000'),
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]),
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
  const corsOrigin = (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void,
  ) => {
    const normalizedOrigin = typeof origin === 'string' ? origin : undefined;

    if (
      !normalizedOrigin ||
      allowedOrigins.includes(normalizedOrigin) ||
      isAllowedDevOrigin(normalizedOrigin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${normalizedOrigin} is not allowed by CORS.`), false);
  };

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
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
