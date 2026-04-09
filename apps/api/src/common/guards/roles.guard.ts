import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODES } from '../errors/error-codes';
import { ROLES_KEY } from '../../modules/auth/constants/roles.constants';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const currentRoles = request.user?.roles ?? [];

    const isAllowed =
      currentRoles.includes('superadmin') ||
      requiredRoles.some((requiredRole) => currentRoles.includes(requiredRole));

    if (!isAllowed) {
      throw new ForbiddenException({
        code: ERROR_CODES.forbidden,
        message: 'You do not have access to this resource.',
        fields: {},
      });
    }

    return true;
  }
}
