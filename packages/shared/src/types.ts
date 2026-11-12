import type { Difficulty } from './config';

export const TASK_STATUSES = ['UPCOMING', 'COMPLETED', 'CANCELLED', 'OVERDUE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Etichetele afișate în interfață pentru fiecare stare. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  UPCOMING: 'Urmează',
  COMPLETED: 'Completă',
  CANCELLED: 'Anulată',
  OVERDUE: 'Restant',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: 'Ușor',
  MEDIUM: 'Mediu',
  HARD: 'Greu',
};

/** Profilul utilizatorului curent, așa cum îl întoarce GET /me. */
export interface MeDto {
  id: string;
  email: string;
  nickname: string;
  timezone: string;
  xpTotal: number;
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  hp: number;
  hpMax: number;
  coins: number;
  /** Zilele de serie (COMBO) încă valabile. */
  streakDays: number;
  /** Multiplicatorul de XP pentru următoarea finalizare la timp. */
  comboMultiplier: number;
  /** XP primit azi, din plafonul zilnic (Stamina). */
  staminaUsed: number;
  staminaMax: number;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: MeDto;
}

/** Forma tuturor erorilor întoarse de API. */
export interface ApiError {
  code: string;
  message: string;
  details?: { path: string; message: string }[];
}
