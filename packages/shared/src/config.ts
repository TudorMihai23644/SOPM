/**
 * Valorile jocului, folosite de server, web și mobil. `npm run db:seed` le copiază în
 * tabela app_config, dar serverul le citește de aici; o ajustare cere o republicare.
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
  minDeadlineLeadSeconds: number;
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
  comboStepPerDay: number;
  comboMaxMultiplier: number;
  undoWindowSeconds: number;
  gameDayStartHour: number;
  reviewTimeoutHours: number;
  /** Bonusul de grup: fracțiunea din XP-ul de bază primită de fiecare participant. */
  groupBonusXpRatio: number;
  groupBonusesPerTeamPerDay: number;
  validatorRewardXp: number;
  validatorRewardsPerDay: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  difficulty: {
    EASY: { xp: 10, coins: 5, hpLoss: 5 },
    MEDIUM: { xp: 25, coins: 10, hpLoss: 10 },
    HARD: { xp: 50, coins: 20, hpLoss: 15 },
  },
  staminaDailyXp: 150,
  minCompletionSeconds: 60,
  minDeadlineLeadSeconds: 60,
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
  comboStepPerDay: 0.05,
  comboMaxMultiplier: 1.5,
  undoWindowSeconds: 10,
  gameDayStartHour: 4,
  reviewTimeoutHours: 48,
  groupBonusXpRatio: 0.5,
  groupBonusesPerTeamPerDay: 3,
  validatorRewardXp: 5,
  validatorRewardsPerDay: 3,
};
