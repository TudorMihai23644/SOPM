import { Injectable } from '@nestjs/common';
import { Prisma, type LedgerKind, type Task, type User } from '@prisma/client';
import {
  applyHp,
  completionReward,
  DEFAULT_GAME_CONFIG,
  gameDayOf,
  levelChange,
  levelForTotalXp,
  nextStreak,
  type RewardDto,
} from '@deadlinehero/shared';

type Tx = Prisma.TransactionClient;
const config = DEFAULT_GAME_CONFIG;

interface LedgerRow {
  kind: LedgerKind;
  delta: number;
  reason: string;
  refType: string;
  refId: string;
}

/**
 * Aplică regulile jocului în baza de date. Fiecare modificare de XP, monede sau HP
 * se scrie în registrul de recompense în aceeași tranzacție cu soldul din users;
 * cheia unică a registrului face ca o recompensă să nu se acorde de două ori.
 */
@Injectable()
export class GameService {
  /** Blochează rândul utilizatorului; toate schimbările de sold trec pe aici. */
  async lockUser(tx: Tx, userId: string): Promise<User> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    return tx.user.findUniqueOrThrow({ where: { id: userId } });
  }

  /** Recompensa pentru o finalizare; `task` este activitatea înainte de finalizare. */
  async rewardCompletion(tx: Tx, task: Task, attempt: number, now: Date): Promise<RewardDto> {
    const user = await this.lockUser(tx, task.ownerId);
    const late = task.status === 'OVERDUE';
    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
    const stamina = await tx.dailyStamina.findUnique({
      where: { userId_gameDay: { userId: user.id, gameDay: new Date(`${today}T00:00:00Z`) } },
    });

    // Seria se numără doar pentru finalizări la timp care aduc XP; COMBO-ul folosește seria cu ziua de azi.
    const prospectiveStreak = late ? user.streakDays : nextStreak(user.streakDays, user.lastStreakDay, today);
    const reward = completionReward({
      difficulty: task.difficulty,
      late,
      postponed: task.postponeCount > 0,
      ageSeconds: (now.getTime() - task.createdAt.getTime()) / 1000,
      streakDays: prospectiveStreak,
      staminaUsed: stamina?.xpAwarded ?? 0,
    });

    const ref = { refType: 'TASK', refId: `${task.id}:${attempt}` };
    const level = levelChange(user.xpTotal, user.xpTotal + reward.xp);
    const hp = applyHp(user.hp, user.coins + reward.coins + level.bonusCoins, reward.hp);
    const rows: LedgerRow[] = [
      { kind: 'XP', delta: reward.xp, reason: 'TASK_COMPLETED', ...ref },
      { kind: 'COINS', delta: reward.coins, reason: 'TASK_COMPLETED', ...ref },
      { kind: 'HP', delta: hp.hp - user.hp, reason: 'TASK_COMPLETED', ...ref },
      { kind: 'COINS', delta: level.bonusCoins, reason: 'LEVEL_UP', ...ref },
    ];
    await this.writeLedger(tx, user.id, rows);

    const countsForStreak = !late && reward.xp > 0;
    await tx.user.update({
      where: { id: user.id },
      data: {
        xpTotal: { increment: reward.xp },
        level: level.level,
        coins: { increment: reward.coins + level.bonusCoins },
        hp: hp.hp,
        ...(countsForStreak ? { streakDays: prospectiveStreak, lastStreakDay: today } : {}),
      },
    });
    if (reward.xp > 0) {
      await tx.dailyStamina.upsert({
        where: { userId_gameDay: { userId: user.id, gameDay: new Date(`${today}T00:00:00Z`) } },
        create: { userId: user.id, gameDay: new Date(`${today}T00:00:00Z`), xpAwarded: reward.xp },
        update: { xpAwarded: { increment: reward.xp } },
      });
    }

    return {
      xp: reward.xp,
      coins: reward.coins + level.bonusCoins,
      hp: hp.hp - user.hp,
      multiplier: reward.multiplier,
      levelsGained: level.levelsGained,
      level: level.level,
      tooFast: reward.tooFast,
      staminaCapped: reward.staminaCapped,
    };
  }

  /**
   * Undo: retrage tot ce a adus finalizarea respectivă, prin rânduri compensatorii
   * (registrul nu se modifică, doar se adaugă). Stamina folosită se eliberează.
   */
  async revokeCompletion(tx: Tx, task: Task, attempt: number): Promise<void> {
    const user = await this.lockUser(tx, task.ownerId);
    const refId = `${task.id}:${attempt}`;
    const granted = await tx.rewardLedger.groupBy({
      by: ['kind'],
      where: { userId: user.id, refType: 'TASK', refId, reason: { in: ['TASK_COMPLETED', 'LEVEL_UP'] } },
      _sum: { delta: true },
    });
    const sum = (kind: LedgerKind) => granted.find((g) => g.kind === kind)?._sum.delta ?? 0;
    const xp = sum('XP');
    const coins = Math.min(sum('COINS'), user.coins);
    const hp = Math.min(sum('HP'), user.hp - 1);

    await this.writeLedger(tx, user.id, [
      { kind: 'XP', delta: -xp, reason: 'UNDO', refType: 'TASK', refId },
      { kind: 'COINS', delta: -coins, reason: 'UNDO', refType: 'TASK', refId },
      { kind: 'HP', delta: -hp, reason: 'UNDO', refType: 'TASK', refId },
    ]);
    const xpTotal = user.xpTotal - xp;
    await tx.user.update({
      where: { id: user.id },
      data: { xpTotal, level: levelForTotalXp(xpTotal), coins: { decrement: coins }, hp: { decrement: hp } },
    });

    if (xp > 0 && task.completedAt) {
      const day = gameDayOf(task.completedAt, user.timezone, config.gameDayStartHour);
      await tx.dailyStamina.updateMany({
        where: { userId: user.id, gameDay: new Date(`${day}T00:00:00Z`) },
        data: { xpAwarded: { decrement: xp } },
      });
    }
  }

  /**
   * Penalizarea de HP când o activitate devine Restantă: o singură dată per activitate
   * (marcajul hp_penalty_applied și cheia unică din registru). La 0 HP: KO.
   * Întoarce true dacă utilizatorul a ajuns KO.
   */
  async applyOverduePenalty(tx: Tx, task: Task): Promise<boolean> {
    if (task.hpPenaltyApplied) return false;
    const user = await this.lockUser(tx, task.ownerId);
    const loss = config.difficulty[task.difficulty].hpLoss;
    const result = applyHp(user.hp, user.coins, -loss);
    const ref = { refType: 'TASK', refId: task.id };

    const rows: LedgerRow[] = [{ kind: 'HP', delta: -Math.min(loss, user.hp), reason: 'OVERDUE_PENALTY', ...ref }];
    if (result.ko) {
      rows.push({ kind: 'COINS', delta: -result.coinsLost, reason: 'KO_PENALTY', ...ref });
      rows.push({ kind: 'HP', delta: result.hp, reason: 'KO_RESET', ...ref });
    }
    await this.writeLedger(tx, user.id, rows);
    await tx.user.update({ where: { id: user.id }, data: { hp: result.hp, coins: { decrement: result.coinsLost } } });
    await tx.task.update({ where: { id: task.id }, data: { hpPenaltyApplied: true } });
    return result.ko;
  }

  private async writeLedger(tx: Tx, userId: string, rows: LedgerRow[]): Promise<void> {
    const data = rows.filter((row) => row.delta !== 0).map((row) => ({ userId, ...row }));
    if (data.length > 0) await tx.rewardLedger.createMany({ data });
  }
}
