import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { loginSchema, registerSchema, type AuthResponse, type RegisterData } from '@deadlinehero/shared';
import type { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ENV, type Env } from '../config/env';
import { AuthService, type AuthResult } from './auth.service';
import { TokensService } from './tokens.service';

export const REFRESH_COOKIE = 'dh_refresh';
const COOKIE_PATH = '/api/v1/auth';

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
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.register(body));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.output<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(res, await this.auth.login(body.email, body.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    try {
      return this.respond(res, await this.auth.refresh(this.readCookie(req)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private respond(res: Response, result: AuthResult): AuthResponse {
    res.cookie(REFRESH_COOKIE, result.refreshToken, { ...this.cookieOptions(), maxAge: this.tokens.refreshTtlMs });
    return { accessToken: result.accessToken, user: result.user };
  }

  private readCookie(req: Request): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.env.COOKIE_SECURE, sameSite: 'lax', path: COOKIE_PATH };
  }
}
