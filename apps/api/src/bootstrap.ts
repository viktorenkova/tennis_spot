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

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl', 'http://localhost:3000'),
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
