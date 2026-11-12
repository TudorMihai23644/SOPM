import type { Task } from '@prisma/client';
import { DEFAULT_GAME_CONFIG, type HistoryEntryDto, type HistoryEvent, type TaskDto } from '@deadlinehero/shared';
import type { HistoryLog } from '@prisma/client';

export function undoDeadline(task: Pick<Task, 'status' | 'undoUsed' | 'completedAt'>): Date | null {
  if (task.status !== 'COMPLETED' || task.undoUsed || !task.completedAt) return null;
  return new Date(task.completedAt.getTime() + DEFAULT_GAME_CONFIG.undoWindowSeconds * 1000);
}

export function toTaskDto(task: Task, now: Date): TaskDto {
  const undoUntil = undoDeadline(task);
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    deadlineAt: task.deadlineAt.toISOString(),
    difficulty: task.difficulty,
    status: task.status,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
    overdueAt: task.overdueAt?.toISOString() ?? null,
    postponeCount: task.postponeCount,
    postponesLeft: Math.max(0, DEFAULT_GAME_CONFIG.maxPostpones - task.postponeCount),
    undoAvailableUntil: undoUntil && undoUntil > now ? undoUntil.toISOString() : null,
  };
}

export function toHistoryDto(entry: HistoryLog): HistoryEntryDto {
  return {
    id: entry.id,
    taskId: entry.taskId,
    taskTitle: entry.taskTitle,
    event: entry.event as HistoryEvent,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    note: entry.note,
    at: entry.at.toISOString(),
  };
}
