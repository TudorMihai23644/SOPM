/**
 * Regulile jocului, ca funcții pure: serverul le folosește ca autoritate,
 * interfața doar ca previzualizare. Valorile vin din GameConfig.
 */
import { DEFAULT_GAME_CONFIG, type Difficulty, type GameConfig } from './config';
import { levelForTotalXp } from './level';

/** Multiplicatorul COMBO: +5% pentru fiecare zi de serie, cel mult ×1,5. */
export function comboMultiplier(streakDays: number, config: GameConfig = DEFAULT_GAME_CONFIG): number {
  const raw = 1 + config.comboStepPerDay * Math.max(0, streakDays);
  return Math.min(config.comboMaxMultiplier, Math.round(raw * 100) / 100);
}

export interface CompletionInput {
  difficulty: Difficulty;
  /** Activitatea era Restantă la finalizare. */
  late: boolean;
  /** Termenul a fost amânat cel puțin o dată. */
  postponed: boolean;
  /** Secunde de la crearea activității. */
  ageSeconds: number;
  /** Seria (zilele de COMBO) după ce se numără și ziua de azi. */
  streakDays: number;
  /** XP primit deja în ziua de joc curentă. */
  staminaUsed: number;
}

export interface CompletionReward {
  xp: number;
  coins: number;
  hp: number;
  baseXp: number;
  multiplier: number;
  tooFast: boolean;
  staminaCapped: boolean;
}

/** Recompensa pentru finalizarea unei activități (pașii 2–8 din „Calculul recompensei”). */
export function completionReward(input: CompletionInput, config: GameConfig = DEFAULT_GAME_CONFIG): CompletionReward {
  const base = config.difficulty[input.difficulty];
  const empty = { xp: 0, coins: 0, hp: 0, baseXp: base.xp, multiplier: 1, staminaCapped: false };

  if (input.ageSeconds < config.minCompletionSeconds) return { ...empty, tooFast: true };

  let xp = base.xp;
  let coins = base.coins;
  if (input.late) {
    xp = Math.floor(xp * config.lateXpRatio);
    coins = 0;
  }
  if (input.postponed) {
    xp = Math.floor(xp * config.postponeMultiplier);
    coins = Math.floor(coins * config.postponeMultiplier);
  }

  const multiplier = input.late ? 1 : comboMultiplier(input.streakDays, config);
  xp = Math.floor(xp * multiplier);

  const staminaLeft = Math.max(0, config.staminaDailyXp - input.staminaUsed);
  const staminaCapped = xp > staminaLeft;
  xp = Math.min(xp, staminaLeft);
  if (xp === 0) coins = 0;

  const hp = !input.late && xp > 0 ? config.onTimeHpRegen : 0;
  return { xp, coins, hp, baseXp: base.xp, multiplier, tooFast: false, staminaCapped };
}

export interface LevelChange {
  level: number;
  levelsGained: number;
  bonusCoins: number;
}

/** Nivelul după un câștig de XP și monedele bonus pentru fiecare nivel nou. */
export function levelChange(xpBefore: number, xpAfter: number, config: GameConfig = DEFAULT_GAME_CONFIG): LevelChange {
  const before = levelForTotalXp(xpBefore);
  const level = levelForTotalXp(xpAfter);
  const levelsGained = Math.max(0, level - before);
  return { level, levelsGained, bonusCoins: levelsGained * config.levelUpCoins };
}

export interface HpChange {
  hp: number;
  /** Monedele pierdute la KO (pozitiv). */
  coinsLost: number;
  ko: boolean;
}

/**
 * Aplică o pierdere sau un câștig de HP. La 0 HP: KO, −20% monede (rotunjit în jos)
 * și HP revine la 50, în același pas, ca penalizarea să nu se aplice de două ori.
 */
export function applyHp(hp: number, coins: number, delta: number, config: GameConfig = DEFAULT_GAME_CONFIG): HpChange {
  const next = Math.min(config.hpMax, hp + delta);
  if (next > 0) return { hp: next, coinsLost: 0, ko: false };
  return { hp: config.hpAfterKo, coinsLost: Math.floor(coins * config.koCoinPenaltyRatio), ko: true };
}

/** Seria (COMBO) după o finalizare la timp care a adus XP în ziua `today` (AAAA-LL-ZZ). */
export function nextStreak(streakDays: number, lastDay: string | null, today: string): number {
  if (lastDay === today) return Math.max(1, streakDays);
  if (lastDay && isPreviousDay(lastDay, today)) return streakDays + 1;
  return 1;
}

/** Seria afișată: rămâne valabilă azi și mâine; după o zi ratată se pierde. */
export function currentStreak(streakDays: number, lastDay: string | null, today: string): number {
  if (!lastDay) return 0;
  return lastDay === today || isPreviousDay(lastDay, today) ? streakDays : 0;
}

function isPreviousDay(day: string, today: string): boolean {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`);
  return ms === 24 * 60 * 60 * 1000;
}
