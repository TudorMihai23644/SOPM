import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import type { AuthResponse, RegisterData } from '@deadlinehero/shared';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { TokensService } from './tokens.service';

const ARGON2_OPTIONS = { type: argon2.argon2id } as const;

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
