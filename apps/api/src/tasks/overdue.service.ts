import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CLOCK, type Clock } from '../common/clock';
import { GameService } from '../game/game.service';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_SIZE = 500;

/**
 * Trece în „Restant” activitățile al căror termen a trecut și aplică penalizarea de HP.
 * Condiția vine din date (deadline_at ≤ acum), nu din „ultima rulare”, deci după o pauză
 * a serverului recuperează tot. Rândurile blocate de altă tranzacție sunt sărite
 * (SKIP LOCKED), deci două rulări simultane nu procesează aceeași activitate de două ori.
 */
@Injectable()
export class OverdueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly game: GameService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Marchează un lot ca Restant; întoarce câte activități au devenit restante. */
  async markOverdueBatch(ownerId?: string, now: Date = this.clock.now()): Promise<number> {
    const nowUtc = Prisma.sql`(${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
    const owner = ownerId ? Prisma.sql`AND owner_id = ${ownerId}::uuid` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<{ task_id: string }[]>`
      WITH due AS (
        SELECT id FROM tasks
        WHERE status = 'UPCOMING'::"TaskStatus" AND deadline_at <= ${nowUtc} ${owner}
        ORDER BY deadline_at
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      ), updated AS (
        UPDATE tasks t
        SET status = 'OVERDUE'::"TaskStatus", overdue_at = t.deadline_at, updated_at = ${nowUtc}
        FROM due WHERE t.id = due.id
        RETURNING t.id, t.owner_id, t.title, t.deadline_at
      )
      INSERT INTO history_log (id, user_id, task_id, task_title, event, from_status, to_status, at)
      SELECT gen_random_uuid(), owner_id, id, title, 'OVERDUE', 'UPCOMING'::"TaskStatus", 'OVERDUE'::"TaskStatus", deadline_at
      FROM updated
      RETURNING task_id`;
    return rows.length;
  }

  /** Aplică penalizările de HP încă neaplicate, în ordinea termenelor. */
  async applyPendingPenalties(ownerId?: string): Promise<number> {
    let applied = 0;
    for (;;) {
      const pending = await this.prisma.task.findMany({
        where: { status: 'OVERDUE', hpPenaltyApplied: false, ...(ownerId ? { ownerId } : {}) },
        orderBy: { deadlineAt: 'asc' },
        select: { id: true },
        take: BATCH_SIZE,
      });
      for (const { id } of pending) {
        const done = await this.prisma.$transaction(async (tx) => {
          const locked = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM tasks WHERE id = ${id}::uuid AND hp_penalty_applied = false FOR UPDATE SKIP LOCKED`;
          if (locked.length === 0) return false;
          const task = await tx.task.findUniqueOrThrow({ where: { id } });
          const ko = await this.game.applyOverduePenalty(tx, task);
          if (ko) await tx.historyLog.updateMany({ where: { taskId: id, event: 'OVERDUE' }, data: { note: 'KO' } });
          return true;
        });
        if (done) applied += 1;
      }
      if (pending.length < BATCH_SIZE) return applied;
    }
  }

  /** Procesează loturi până nu mai rămâne nimic restant neprocesat, apoi penalizările. */
  async markAllOverdue(ownerId?: string): Promise<number> {
    let total = 0;
    for (;;) {
      const count = await this.markOverdueBatch(ownerId);
      total += count;
      if (count < BATCH_SIZE) break;
    }
    await this.applyPendingPenalties(ownerId);
    return total;
  }
}
