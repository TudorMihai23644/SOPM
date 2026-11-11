import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
}

const invalidSession = () =>
  new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_SESSION', 'Sesiunea a expirat. Autentificați-vă din nou.');

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId } satisfies AccessTokenPayload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, { secret: this.env.JWT_ACCESS_SECRET });
  }

  get refreshTtlMs(): number {
    return this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  /** Creează un refresh token nou; în baza de date se păstrează doar hash-ul lui. */
  async issueRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + this.refreshTtlMs) },
    });
    return token;
  }

  /**
   * Schimbă un refresh token valid cu unul nou (rotație). Un token deja folosit
   * înseamnă că a fost furat sau copiat, așa că se revocă toate sesiunile utilizatorului.
   */
  async rotateRefreshToken(token: string | undefined): Promise<{ userId: string; refreshToken: string }> {
    if (!token) throw invalidSession();
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored) throw invalidSession();

    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw invalidSession();
    }
    if (stored.expiresAt <= new Date()) throw invalidSession();

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Două cereri simultane cu același token: doar prima reușește.
    if (revoked.count !== 1) throw invalidSession();

    return { userId: stored.userId, refreshToken: await this.issueRefreshToken(stored.userId) };
  }

  async revokeRefreshToken(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
