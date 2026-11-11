import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { TokensService } from './tokens.service';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

/** Cere un JWT de acces valid în antetul Authorization: Bearer <token>. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Autentificare necesară');
    }
    try {
      const payload = await this.tokens.verifyAccessToken(token);
      request.userId = payload.sub;
      return true;
    } catch {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'TOKEN_EXPIRED', 'Sesiunea a expirat');
    }
  }
}
