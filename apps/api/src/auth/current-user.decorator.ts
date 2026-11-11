import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/** Id-ul utilizatorului autentificat, pus de JwtAuthGuard. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
