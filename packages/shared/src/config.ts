/**
 * Valorile inițiale ale jocului. Serverul le copiază în tabela app_config,
 * de unde pot fi ajustate după playtest fără modificări de cod.
 */
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface DifficultyValues {
  xp: number;
  coins: number;
  hpLoss: number;
}

export interface GameConfig {
  difficulty: Record<Difficulty, DifficultyValues>;
  staminaDailyXp: number;
  minCompletionSeconds: number;
  maxTasksCreatedPerDay: number;
  maxActiveTasks: number;
  maxPostpones: number;
  postponeMultiplier: number;
  lateXpRatio: number;
  hpMax: number;
  hpStart: number;
  onTimeHpRegen: number;
  cleanDayHpRegen: number;
  hpAfterKo: number;
  koCoinPenaltyRatio: number;
  levelUpCoins: number;
  undoWindowSeconds: number;
  gameDayStartHour: number;
  reviewTimeoutHours: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  difficulty: {
    EASY: { xp: 10, coins: 5, hpLoss: 5 },
    MEDIUM: { xp: 25, coins: 10, hpLoss: 10 },
    HARD: { xp: 50, coins: 20, hpLoss: 15 },
  },
  staminaDailyXp: 150,
  minCompletionSeconds: 60,
  maxTasksCreatedPerDay: 30,
  maxActiveTasks: 100,
  maxPostpones: 2,
  postponeMultiplier: 0.5,
  lateXpRatio: 0.25,
  hpMax: 100,
  hpStart: 100,
  onTimeHpRegen: 5,
  cleanDayHpRegen: 10,
  hpAfterKo: 50,
  koCoinPenaltyRatio: 0.2,
  levelUpCoins: 25,
  undoWindowSeconds: 10,
  gameDayStartHour: 4,
  reviewTimeoutHours: 48,
};
