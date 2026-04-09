import { HttpException, HttpStatus } from '@nestjs/common';

export type AppErrorPayload = {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  meta?: Record<string, unknown>;
};

export class AppError extends HttpException {
  constructor(status: HttpStatus, payload: AppErrorPayload) {
    super(payload, status);
  }
}
