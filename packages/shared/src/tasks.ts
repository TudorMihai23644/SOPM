import { z } from 'zod';
import { DIFFICULTIES, type Difficulty } from './config';
import type { TaskStatus } from './types';

export const taskTitleSchema = z
  .string({ error: 'Titlul este obligatoriu' })
  .trim()
  .min(1, { error: 'Titlul este obligatoriu' })
  .max(120, { error: 'Titlul poate avea cel mult 120 de caractere' });

export const taskDescriptionSchema = z
  .string()
  .trim()
  .max(2000, { error: 'Descrierea poate avea cel mult 2000 de caractere' })
  .transform((value) => (value === '' ? null : value))
  .nullable();

export const taskDeadlineSchema = z.iso.datetime({ offset: true, error: 'Termenul nu este o dată validă' });

export const difficultySchema = z.enum(DIFFICULTIES, { error: 'Alegeți dificultatea' });

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional(),
  deadlineAt: taskDeadlineSchema,
  difficulty: difficultySchema,
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type CreateTaskData = z.output<typeof createTaskSchema>;

/** Dificultatea nu se mai schimbă după creare, ca recompensa să nu poată fi umflată ulterior. */
export const updateTaskSchema = z
  .strictObject(
    {
      title: taskTitleSchema.optional(),
      description: taskDescriptionSchema.optional(),
      deadlineAt: taskDeadlineSchema.optional(),
    },
    { error: 'Câmp necunoscut sau care nu se poate modifica' },
  )
  .refine((value) => Object.keys(value).length > 0, { error: 'Nimic de modificat' });
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;
export type UpdateTaskData = z.output<typeof updateTaskSchema>;

export const HISTORY_EVENTS = [
  'CREATED',
  'COMPLETED',
  'COMPLETED_LATE',
  'CANCELLED',
  'OVERDUE',
  'UNDONE',
  'POSTPONED',
  'DELETED',
] as const;
export type HistoryEvent = (typeof HISTORY_EVENTS)[number];

export const HISTORY_EVENT_LABELS: Record<HistoryEvent, string> = {
  CREATED: 'Creată',
  COMPLETED: 'Completată la timp',
  COMPLETED_LATE: 'Completată cu întârziere',
  CANCELLED: 'Anulată',
  OVERDUE: 'A devenit restantă',
  UNDONE: 'Finalizare anulată (Undo)',
  POSTPONED: 'Termen amânat',
  DELETED: 'Ștearsă',
};

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  deadlineAt: string;
  difficulty: Difficulty;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  overdueAt: string | null;
  postponeCount: number;
  postponesLeft: number;
  /** Până când se mai poate apăsa Undo; null dacă nu se mai poate. */
  undoAvailableUntil: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface HistoryEntryDto {
  id: string;
  taskId: string | null;
  taskTitle: string;
  event: HistoryEvent;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  at: string;
}
