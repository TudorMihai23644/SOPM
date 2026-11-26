import { Injectable } from '@nestjs/common';
import { Prisma, type Difficulty, type LedgerKind, type Task, type User } from '@prisma/client';
import {
  applyHp,
  capByStamina,
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

export interface LedgerRef {
  refType: string;
  refId: string;
}

export interface PersonalRewardInput {
  difficulty: Difficulty;
  /** Finalizarea a venit după termen. */
  late: boolean;
  postponed: boolean;
  /** Secunde de la crearea sarcinii până la finalizare. */
  ageSeconds: number;
}

const dayKey = (day: string) => new Date(`${day}T00:00:00Z`);

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

  /** XP primit deja în ziua de joc a momentului `now`. */
  async staminaUsed(tx: Tx, user: User, now: Date): Promise<number> {
    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
    const row = await tx.dailyStamina.findUnique({ where: { userId_gameDay: { userId: user.id, gameDay: dayKey(today) } } });
    return row?.xpAwarded ?? 0;
  }

  /** Recompensa pentru finalizarea unei activități; `task` este activitatea înainte de finalizare. */
  rewardCompletion(tx: Tx, task: Task, attempt: number, now: Date): Promise<RewardDto> {
    return this.grantPersonalReward(
      tx,
      task.ownerId,
      {
        difficulty: task.difficulty,
        late: task.status === 'OVERDUE',
        postponed: task.postponeCount > 0,
        ageSeconds: (now.getTime() - task.createdAt.getTime()) / 1000,
      },
      { refType: 'TASK', refId: `${task.id}:${attempt}` },
      'TASK_COMPLETED',
      now,
    );
  }

  /**
   * Recompensa personală (activitate sau Shared Quest), după „Calculul recompensei”:
   * prea rapid → 0, restant → 25% XP fără monede, amânat → ×0,5, COMBO, plafon Stamina,
   * +5 HP la timp, nivel nou → +25 monede.
   */
  async grantPersonalReward(
    tx: Tx,
    userId: string,
    input: PersonalRewardInput,
    ref: LedgerRef,
    reason: string,
    now: Date,
  ): Promise<RewardDto> {
    const user = await this.lockUser(tx, userId);
    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);

    // Seria se numără doar pentru finalizări la timp care aduc XP; COMBO-ul folosește seria cu ziua de azi.
    const prospectiveStreak = input.late ? user.streakDays : nextStreak(user.streakDays, user.lastStreakDay, today);
    const reward = completionReward({
      ...input,
      streakDays: prospectiveStreak,
      staminaUsed: await this.staminaUsed(tx, user, now),
    });

    const level = levelChange(user.xpTotal, user.xpTotal + reward.xp);
    const hp = applyHp(user.hp, user.coins + reward.coins + level.bonusCoins, reward.hp);
    await this.writeLedger(tx, user.id, [
      { kind: 'XP', delta: reward.xp, reason, ...ref },
      { kind: 'COINS', delta: reward.coins, reason, ...ref },
      { kind: 'HP', delta: hp.hp - user.hp, reason, ...ref },
      { kind: 'COINS', delta: level.bonusCoins, reason: 'LEVEL_UP', ...ref },
    ]);

    const countsForStreak = !input.late && reward.xp > 0;
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
    await this.addStamina(tx, user.id, today, reward.xp);

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
   * Un câștig simplu de XP (bonus de grup, recompensă de validator), sub plafonul Stamina.
   * Întoarce XP-ul acordat efectiv; 0 dacă recompensa există deja în registru.
   */
  async grantXp(tx: Tx, userId: string, xp: number, reason: string, ref: LedgerRef, now: Date): Promise<number> {
    const user = await this.lockUser(tx, userId);
    const existing = await tx.rewardLedger.findFirst({ where: { userId, kind: 'XP', reason, ...ref } });
    if (existing) return 0;

    const today = gameDayOf(now, user.timezone, config.gameDayStartHour);
    const granted = capByStamina(xp, await this.staminaUsed(tx, user, now));
    if (granted <= 0) return 0;

    const level = levelChange(user.xpTotal, user.xpTotal + granted);
    await this.writeLedger(tx, userId, [
      { kind: 'XP', delta: granted, reason, ...ref },
      { kind: 'COINS', delta: level.bonusCoins, reason: 'LEVEL_UP', refType: ref.refType, refId: `${ref.refId}:${reason}` },
    ]);
    await tx.user.update({
      where: { id: userId },
      data: { xpTotal: { increment: granted }, level: level.level, coins: { increment: level.bonusCoins } },
    });
    await this.addStamina(tx, userId, today, granted);
    return granted;
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
        where: { userId: user.id, gameDay: dayKey(day) },
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
    const ko = await this.penalizeHp(tx, task.ownerId, task.difficulty, { refType: 'TASK', refId: task.id });
    await tx.task.update({ where: { id: task.id }, data: { hpPenaltyApplied: true } });
    return ko;
  }

  /** Pierderea de HP pentru o sarcină restantă (activitate sau Shared Quest); întoarce true la KO. */
  async penalizeHp(tx: Tx, userId: string, difficulty: Difficulty, ref: LedgerRef): Promise<boolean> {
    const user = await this.lockUser(tx, userId);
    const loss = config.difficulty[difficulty].hpLoss;
    const result = applyHp(user.hp, user.coins, -loss);

    const rows: LedgerRow[] = [{ kind: 'HP', delta: -Math.min(loss, user.hp), reason: 'OVERDUE_PENALTY', ...ref }];
    if (result.ko) {
      rows.push({ kind: 'COINS', delta: -result.coinsLost, reason: 'KO_PENALTY', ...ref });
      rows.push({ kind: 'HP', delta: result.hp, reason: 'KO_RESET', ...ref });
    }
    await this.writeLedger(tx, user.id, rows);
    await tx.user.update({ where: { id: user.id }, data: { hp: result.hp, coins: { decrement: result.coinsLost } } });
    return result.ko;
  }

  /** „Zi curată”: +10 HP (maximum 100), o singură dată per zi de joc. Întoarce HP-ul primit. */
  async grantCleanDay(tx: Tx, userId: string, day: string): Promise<number> {
    const user = await this.lockUser(tx, userId);
    const ref = { refType: 'DAY', refId: day };
    const existing = await tx.rewardLedger.findFirst({ where: { userId, kind: 'HP', reason: 'CLEAN_DAY', ...ref } });
    if (existing) return 0;
    const gain = Math.min(config.cleanDayHpRegen, config.hpMax - user.hp);
    if (gain <= 0) return 0;
    await this.writeLedger(tx, userId, [{ kind: 'HP', delta: gain, reason: 'CLEAN_DAY', ...ref }]);
    await tx.user.update({ where: { id: userId }, data: { hp: { increment: gain } } });
    return gain;
  }

  private async addStamina(tx: Tx, userId: string, day: string, xp: number): Promise<void> {
    if (xp <= 0) return;
    await tx.dailyStamina.upsert({
      where: { userId_gameDay: { userId, gameDay: dayKey(day) } },
      create: { userId, gameDay: dayKey(day), xpAwarded: xp },
      update: { xpAwarded: { increment: xp } },
    });
  }

  private async writeLedger(tx: Tx, userId: string, rows: LedgerRow[]): Promise<void> {
    const data = rows.filter((row) => row.delta !== 0).map((row) => ({ userId, ...row }));
    if (data.length > 0) await tx.rewardLedger.createMany({ data });
  }
}
