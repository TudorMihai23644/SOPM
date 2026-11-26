import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { AuthResponse, RegisterData } from '@deadlinehero/shared';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from './mail.service';
import { hashToken, TokensService } from './tokens.service';

const ARGON2_OPTIONS = { type: argon2.argon2id } as const;
const RESET_TTL_MS = 30 * 60 * 1000;

export interface AuthResult extends AuthResponse {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  /** Hash folosit când emailul nu există, ca timpul de răspuns să nu dezvăluie conturile. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(data: RegisterData): Promise<AuthResult> {
    const passwordHash = await argon2.hash(data.password, ARGON2_OPTIONS);
    try {
      const user = await this.prisma.user.create({
        data: { email: data.email, nickname: data.nickname, timezone: data.timezone, passwordHash },
      });
      return this.startSession(user.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = String(error.meta?.target ?? '');
        if (target.includes('nickname')) {
          throw new AppError(HttpStatus.CONFLICT, 'NICKNAME_TAKEN', 'Porecla este deja folosită');
        }
        throw new AppError(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'Există deja un cont cu acest email');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await argon2.verify(hash, password).catch(() => false);
    if (!user || !valid) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email sau parolă greșită');
    }
    return this.startSession(user.id);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const rotated = await this.tokens.rotateRefreshToken(refreshToken);
    return {
      accessToken: await this.tokens.signAccessToken(rotated.userId),
      refreshToken: rotated.refreshToken,
      user: await this.users.getMe(rotated.userId),
    };
  }

  logout(refreshToken: string | undefined): Promise<void> {
    return this.tokens.revokeRefreshToken(refreshToken);
  }

  /** Verifică parola curentă (pentru schimbarea parolei și ștergerea contului). */
  async verifyPassword(userId: string, password: string, field = 'password'): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!valid) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'WRONG_PASSWORD', 'Parola nu este corectă', [
        { path: field, message: 'Parola nu este corectă' },
      ]);
    }
  }

  /** Schimbă parola, revocă toate sesiunile și pornește una nouă pe dispozitivul curent. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
    await this.verifyPassword(userId, currentPassword, 'currentPassword');
    await this.setPassword(userId, newPassword);
    return this.startSession(userId);
  }

  /** Trimite un link de resetare valabil 30 de minute; nu dezvăluie dacă emailul există. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    await this.mail.sendPasswordReset(user.email, `${this.env.APP_URL}/resetare-parola?token=${token}`);
  }

  /** Folosește tokenul o singură dată; la reușită, toate sesiunile vechi se închid. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const used = await this.prisma.passwordResetToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'INVALID_RESET_TOKEN', 'Linkul de resetare a expirat sau a fost deja folosit');
    }
    const stored = await this.prisma.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    await this.setPassword(stored.userId, newPassword);
  }

  private async setPassword(userId: string, password: string): Promise<void> {
    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllForUser(userId);
  }

  private async startSession(userId: string): Promise<AuthResult> {
    const [accessToken, refreshToken, user] = await Promise.all([
      this.tokens.signAccessToken(userId),
      this.tokens.issueRefreshToken(userId),
      this.users.getMe(userId),
    ]);
    return { accessToken, refreshToken, user };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash('parola-inexistenta-pentru-timp-constant', ARGON2_OPTIONS);
    return this.dummyHash;
  }
}
