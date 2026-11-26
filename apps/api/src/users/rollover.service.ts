import { Inject, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { DEFAULT_GAME_CONFIG, gameDayOf, zonedTimeToUtc } from '@deadlinehero/shared';
import { CLOCK, type Clock } from '../common/clock';
import { GameService } from '../game/game.service';
import { PrismaService } from '../prisma/prisma.service';

const config = DEFAULT_GAME_CONFIG;
const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;
/** După o pauză lungă a serverului se recuperează cel mult ultima săptămână. */
const MAX_CATCH_UP_DAYS = 7;

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Job-ul daily-rollover: pentru utilizatorii la care a trecut ora 04:00 locală, evaluează
 * ziua încheiată („zi curată” → +10 HP) și deschide ziua nouă (Stamina se ține pe zi de joc,
 * deci pornește singură de la 0). Câmpul last_rollover_day și cheia unică din registru
 * fac rularea idempotentă.
 */
@Injectable()
export class RolloverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Întoarce câte zile curate s-au recompensat. */
  async run(now: Date = this.clock.now()): Promise<number> {
    let rewarded = 0;
    let cursor: string | undefined;
    for (;;) {
      const users = await this.prisma.user.findMany({
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      for (const user of users) rewarded += await this.rollUser(user, now);
      if (users.length < BATCH_SIZE) return rewarded;
      cursor = users[users.length - 1].id;
    }
  }

  async rollUser(user: User, now: Date): Promise<number> {
    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
    const last = user.lastRolloverDay;
    if (last === today) return 0;

    let rewarded = 0;
    if (last && last < today) {
      const first = addDays(today, -MAX_CATCH_UP_DAYS) > last ? addDays(today, -MAX_CATCH_UP_DAYS) : last;
      for (let day = first; day < today; day = addDays(day, 1)) {
        if (await this.isCleanDay(user, day)) {
          const gained = await this.prisma.$transaction((tx) => this.game.grantCleanDay(tx, user.id, day));
          if (gained > 0) rewarded += 1;
        }
      }
    }
    // Actualizare condiționată: două rulări simultane nu deschid ziua de două ori.
    await this.prisma.user.updateMany({ where: { id: user.id, lastRolloverDay: last }, data: { lastRolloverDay: today } });
    return rewarded;
  }

  /** Cel puțin o finalizare la timp și nicio sarcină nou restantă în ziua de joc. */
  async isCleanDay(user: Pick<User, 'id' | 'timezone'>, day: string): Promise<boolean> {
    const [y, m, d] = day.split('-').map(Number);
    const start = zonedTimeToUtc(y, m, d, config.gameDayStartHour, user.timezone);
    const [ny, nm, nd] = addDays(day, 1).split('-').map(Number);
    const end = zonedTimeToUtc(ny, nm, nd, config.gameDayStartHour, user.timezone);
    const window = { gte: start, lt: end };

    const [newOverdueTasks, newOverdueQuests] = await Promise.all([
      this.prisma.task.count({ where: { ownerId: user.id, overdueAt: window } }),
      this.prisma.questParticipant.count({ where: { userId: user.id, overdueAt: window } }),
    ]);
    if (newOverdueTasks + newOverdueQuests > 0) return false;

    const completed = await this.prisma.task.findMany({
      where: { ownerId: user.id, status: 'COMPLETED', completedFrom: 'UPCOMING', completedAt: window },
      select: { createdAt: true, completedAt: true },
    });
    const onTime = completed.some(
      (t) => t.completedAt && t.completedAt.getTime() - t.createdAt.getTime() >= config.minCompletionSeconds * 1000,
    );
    if (onTime) return true;
    const quests = await this.prisma.questParticipant.count({
      where: { userId: user.id, status: 'VALIDATED', doneLate: false, doneAt: window },
    });
    return quests > 0;
  }
}
