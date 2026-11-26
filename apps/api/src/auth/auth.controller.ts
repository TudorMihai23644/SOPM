import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  changePasswordSchema,
  CLIENT_HEADER,
  forgotPasswordSchema,
  loginSchema,
  MOBILE_CLIENT,
  refreshBodySchema,
  registerSchema,
  resetPasswordSchema,
  type AuthResponse,
  type RegisterData,
} from '@deadlinehero/shared';
import type { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ENV, type Env } from '../config/env';
import { AuthService, type AuthResult } from './auth.service';
import { CurrentUserId } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokensService } from './tokens.service';

export const REFRESH_COOKIE = 'dh_refresh';
const COOKIE_PATH = '/api/v1/auth';
type RefreshBody = z.output<typeof refreshBodySchema>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterData,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.register(body));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.login(body.email, body.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(refreshBodySchema)) body: RefreshBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    try {
      return this.respond(req, res, await this.auth.refresh(this.readRefreshToken(req, body)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(refreshBodySchema)) body: RefreshBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.readRefreshToken(req, body));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  /** Schimbarea parolei revocă toate sesiunile și pornește una nouă pe dispozitivul curent. */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async changePassword(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: z.output<typeof changePasswordSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.changePassword(userId, body.currentPassword, body.newPassword));
  }

  /** Răspunde la fel indiferent dacă emailul există, ca să nu dezvăluie conturile. */
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: z.output<typeof forgotPasswordSchema>) {
    await this.auth.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: z.output<typeof resetPasswordSchema>) {
    await this.auth.resetPassword(body.token, body.newPassword);
  }

  /**
   * Pe web, refresh token-ul stă doar în cookie-ul HttpOnly. Aplicația mobilă (antetul
   * x-client: mobile) nu are cookie-uri, deci îl primește în corp și îl ține în secure-store.
   */
  private respond(req: Request, res: Response, result: AuthResult): AuthResponse {
    res.cookie(REFRESH_COOKIE, result.refreshToken, { ...this.cookieOptions(), maxAge: this.tokens.refreshTtlMs });
    const mobile = req.header(CLIENT_HEADER) === MOBILE_CLIENT;
    return { accessToken: result.accessToken, user: result.user, ...(mobile ? { refreshToken: result.refreshToken } : {}) };
  }

  private readRefreshToken(req: Request, body: RefreshBody): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    if (typeof value === 'string') return value;
    return body?.refreshToken;
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.env.COOKIE_SECURE, sameSite: 'lax', path: COOKIE_PATH };
  }
}
