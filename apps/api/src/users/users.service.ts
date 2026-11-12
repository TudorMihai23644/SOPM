import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  comboMultiplier,
  currentStreak,
  DEFAULT_GAME_CONFIG,
  gameDayOf,
  levelProgress,
  type MeDto,
} from '@deadlinehero/shared';
import type { Prisma } from '@prisma/client';
import { AppError } from '../common/app-error';
import { CLOCK, type Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';

const config = DEFAULT_GAME_CONFIG;

export function toMeDto(user: User, now: Date, staminaUsed: number): MeDto {
  const progress = levelProgress(user.xpTotal);
  const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
  const streakDays = currentStreak(user.streakDays, user.lastStreakDay, today);
  // COMBO-ul pentru următoarea finalizare: azi numără deja dacă seria a fost prelungită azi.
  const nextStreakDays = user.lastStreakDay === today ? streakDays : streakDays + 1;
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    timezone: user.timezone,
    xpTotal: user.xpTotal,
    level: user.level,
    xpInLevel: progress.xpInLevel,
    xpToNextLevel: progress.xpNeeded,
    hp: user.hp,
    hpMax: config.hpMax,
    coins: user.coins,
    streakDays,
    comboMultiplier: comboMultiplier(nextStreakDays),
    staminaUsed,
    staminaMax: config.staminaDailyXp,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getMe(userId: string, client: PrismaService | Prisma.TransactionClient = this.prisma): Promise<MeDto> {
    const user = await client.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_SESSION', 'Contul nu mai există');
    const now = this.clock.now();
    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
    const stamina = await client.dailyStamina.findUnique({
      where: { userId_gameDay: { userId, gameDay: new Date(`${today}T00:00:00Z`) } },
    });
    return toMeDto(user, now, stamina?.xpAwarded ?? 0);
  }
}
