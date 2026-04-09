import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES } from '../errors/error-codes';

type ErrorBody = {
  code?: string;
  message?: string | string[];
  fields?: Record<string, string[]>;
  meta?: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorBody =
      exception instanceof HttpException
        ? this.normalizeHttpException(exception)
        : {
            code: ERROR_CODES.internal,
            message: 'Unexpected server error.',
            fields: {},
            meta: {},
          };

    response.status(status).json({
      success: false,
      data: null,
      meta: {
        path: request.url,
        timestamp: new Date().toISOString(),
      },
      error: {
        code: errorBody.code,
        message: errorBody.message,
        fields: errorBody.fields ?? {},
        ...(errorBody.meta ? { meta: errorBody.meta } : {}),
      },
    });
  }

  private normalizeHttpException(exception: HttpException) {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const body = response as ErrorBody;
        return {
          code: body.code ?? ERROR_CODES.validation,
          message:
            typeof body.message === 'string'
              ? body.message
              : 'Request validation failed.',
          fields: body.fields ?? {},
          meta: body.meta ?? {},
        };
      }
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        code: this.mapStatusToCode(exception.getStatus()),
        message: response,
        fields: {},
        meta: {},
      };
    }

    if (typeof response === 'object' && response !== null) {
      const body = response as ErrorBody & { error?: string };

      return {
        code: body.code ?? this.mapStatusToCode(exception.getStatus()),
        message:
          typeof body.message === 'string'
            ? body.message
            : body.error ?? 'Request failed.',
        fields: body.fields ?? {},
        meta: body.meta ?? {},
      };
    }

    return {
      code: this.mapStatusToCode(exception.getStatus()),
      message: 'Request failed.',
      fields: {},
      meta: {},
    };
  }

  private mapStatusToCode(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.validation;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.unauthorized;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.forbidden;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.notFound;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.conflict;
      default:
        return ERROR_CODES.internal;
    }
  }
}
