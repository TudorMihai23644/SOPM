import { HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { DEFAULT_GAME_CONFIG, levelProgress, type MeDto } from '@deadlinehero/shared';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';

export function toMeDto(user: User): MeDto {
  const progress = levelProgress(user.xpTotal);
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
    hpMax: DEFAULT_GAME_CONFIG.hpMax,
    coins: user.coins,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MeDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(HttpStatus.UNAUTHORIZED, 'INVALID_SESSION', 'Contul nu mai există');
    return toMeDto(user);
  }
}
