import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Patch, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { deleteAccountSchema, updateProfileSchema, type MeDto, type UpdateProfileInput } from '@deadlinehero/shared';
import type { z } from 'zod';
import { REFRESH_COOKIE } from '../auth/auth.controller';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProfileService } from './profile.service';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly profile: ProfileService,
  ) {}

  @Get()
  getMe(@CurrentUserId() userId: string): Promise<MeDto> {
    return this.users.getMe(userId);
  }

  @Patch()
  update(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<MeDto> {
    return this.profile.update(userId, body);
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="deadlinehero-export.json"')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  export(@CurrentUserId() userId: string): Promise<Record<string, unknown>> {
    return this.profile.export(userId);
  }

  /** Ștergere definitivă; cere parola, ca o sesiune uitată deschisă să nu poată șterge contul. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async remove(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: z.output<typeof deleteAccountSchema>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.profile.deleteAccount(userId, body.password);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }
}
