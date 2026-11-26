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
    let userId: string;
    try {
      userId = (await this.tokens.verifyAccessToken(token)).sub;
    } catch {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'TOKEN_EXPIRED', 'Sesiunea a expirat');
    }
    // Contul poate fi fost șters între timp; tokenul lui nu mai deschide nimic.
    request.userId = await this.tokens.assertUserExists(userId);
    return true;
  }
}
