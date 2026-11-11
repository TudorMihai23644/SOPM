import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type Task, type TaskStatus } from '@prisma/client';
import {
  DEFAULT_GAME_CONFIG,
  gameDayStart,
  type CreateTaskData,
  type HistoryEvent,
  type Page,
  type TaskDto,
  type UpdateTaskData,
} from '@deadlinehero/shared';
import { CLOCK, type Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { TaskErrors } from './errors';
import { OverdueService } from './overdue.service';
import { toTaskDto, undoDeadline } from './task.mapper';
import type { ListTasksQuery } from './tasks.query';

type Tx = Prisma.TransactionClient;
const ACTIVE: TaskStatus[] = ['UPCOMING', 'OVERDUE'];
const config = DEFAULT_GAME_CONFIG;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overdue: OverdueService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(userId: string, data: CreateTaskData): Promise<TaskDto> {
    const now = this.clock.now();
    const deadline = new Date(data.deadlineAt);
    this.assertDeadlineInFuture(deadline, now);

    const task = await this.prisma.$transaction(async (tx) => {
      // Blocarea rândului utilizatorului face ca limitele să țină și la cereri simultane.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      const active = await tx.task.count({ where: { ownerId: userId, status: { in: ACTIVE } } });
      if (active >= config.maxActiveTasks) throw TaskErrors.tooManyActive(config.maxActiveTasks);

      // Se numără din istoric, ca ștergerea unei activități să nu elibereze locul.
      const createdToday = await tx.historyLog.count({
        where: { userId, event: 'CREATED', at: { gte: gameDayStart(now, user.timezone, config.gameDayStartHour) } },
      });
      if (createdToday >= config.maxTasksCreatedPerDay) throw TaskErrors.dailyLimit(config.maxTasksCreatedPerDay);

      const created = await tx.task.create({
        data: {
          ownerId: userId,
          title: data.title,
          description: data.description ?? null,
          deadlineAt: deadline,
          difficulty: data.difficulty,
          createdAt: now,
          updatedAt: now,
        },
      });
      await this.log(tx, created, 'CREATED', null, 'UPCOMING', now);
      return created;
    });
    return toTaskDto(task, now);
  }

  async list(userId: string, query: ListTasksQuery): Promise<Page<TaskDto>> {
    await this.overdue.markAllOverdue(userId);
    const now = this.clock.now();
    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      query.sort === 'deadline' ? [{ deadlineAt: 'asc' }, { id: 'asc' }] : [{ updatedAt: 'desc' }, { id: 'desc' }];

    const tasks = await this.prisma.task.findMany({
      where: { ownerId: userId, ...(query.status ? { status: { in: query.status } } : {}) },
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = tasks.length > query.limit;
    const items = tasks.slice(0, query.limit);
    return {
      items: items.map((task) => toTaskDto(task, now)),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async get(userId: string, taskId: string): Promise<TaskDto> {
    await this.overdue.markAllOverdue(userId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, ownerId: userId } });
    if (!task) throw TaskErrors.notFound();
    return toTaskDto(task, this.clock.now());
  }

  /** Editare și amânare. Doar activitățile care urmează se pot modifica. */
  update(userId: string, taskId: string, data: UpdateTaskData): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (tx, task, now) => {
      if (task.status !== 'UPCOMING') throw TaskErrors.notEditable();

      const changes: Prisma.TaskUpdateInput = { updatedAt: now };
      if (data.title !== undefined) changes.title = data.title;
      if (data.description !== undefined) changes.description = data.description;

      let postponed = false;
      if (data.deadlineAt !== undefined) {
        const deadline = new Date(data.deadlineAt);
        if (deadline.getTime() !== task.deadlineAt.getTime()) {
          this.assertDeadlineInFuture(deadline, now);
          if (deadline > task.deadlineAt) {
            if (task.postponeCount >= config.maxPostpones) throw TaskErrors.postponeLimit();
            changes.postponeCount = { increment: 1 };
            postponed = true;
          }
          changes.deadlineAt = deadline;
        }
      }

      const updated = await tx.task.update({ where: { id: task.id }, data: changes });
      if (postponed) await this.log(tx, updated, 'POSTPONED', 'UPCOMING', 'UPCOMING', now);
      return updated;
    });
  }

  complete(userId: string, taskId: string): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (tx, task, now) => {
      if (!ACTIVE.includes(task.status)) throw TaskErrors.notActive();
      const updated = await tx.task.update({
        where: { id: task.id },
        data: { status: 'COMPLETED', completedAt: now, completedFrom: task.status, updatedAt: now },
      });
      const event: HistoryEvent = task.status === 'OVERDUE' ? 'COMPLETED_LATE' : 'COMPLETED';
      await this.log(tx, updated, event, task.status, 'COMPLETED', now);
      return updated;
    });
  }

  cancel(userId: string, taskId: string): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (tx, task, now) => {
      if (!ACTIVE.includes(task.status)) throw TaskErrors.notActive();
      const updated = await tx.task.update({ where: { id: task.id }, data: { status: 'CANCELLED', updatedAt: now } });
      await this.log(tx, updated, 'CANCELLED', task.status, 'CANCELLED', now);
      return updated;
    });
  }

  /** Undo: în 10 secunde de la finalizare, o singură dată per activitate. */
  undo(userId: string, taskId: string): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (tx, task, now) => {
      const until = undoDeadline(task);
      if (!until || now > until || !task.completedFrom) throw TaskErrors.undoNotAvailable();

      let restored = await tx.task.update({
        where: { id: task.id },
        data: { status: task.completedFrom, completedAt: null, completedFrom: null, undoUsed: true, updatedAt: now },
      });
      await this.log(tx, restored, 'UNDONE', 'COMPLETED', task.completedFrom, now);
      // Dacă termenul a trecut între timp, activitatea revine direct ca restantă.
      restored = await this.applyOverdue(tx, restored, now);
      return restored;
    });
  }

  async remove(userId: string, taskId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const task = await this.lock(tx, userId, taskId);
      await this.log(tx, task, 'DELETED', task.status, null, this.clock.now());
      await tx.task.delete({ where: { id: task.id } });
    });
  }

  /** Rulează o modificare pe o activitate blocată, după ce i-a actualizat starea Restant. */
  private async mutate(
    userId: string,
    taskId: string,
    change: (tx: Tx, task: Task, now: Date) => Promise<Task>,
  ): Promise<TaskDto> {
    const now = this.clock.now();
    const task = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lock(tx, userId, taskId);
      return change(tx, await this.applyOverdue(tx, locked, now), now);
    });
    return toTaskDto(task, now);
  }

  private async lock(tx: Tx, userId: string, taskId: string): Promise<Task> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM tasks WHERE id = ${taskId}::uuid AND owner_id = ${userId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw TaskErrors.notFound();
    return tx.task.findUniqueOrThrow({ where: { id: taskId } });
  }

  private async applyOverdue(tx: Tx, task: Task, now: Date): Promise<Task> {
    if (task.status !== 'UPCOMING' || task.deadlineAt > now) return task;
    const updated = await tx.task.update({
      where: { id: task.id },
      data: { status: 'OVERDUE', overdueAt: task.deadlineAt, updatedAt: now },
    });
    await this.log(tx, updated, 'OVERDUE', 'UPCOMING', 'OVERDUE', task.deadlineAt);
    return updated;
  }

  private log(tx: Tx, task: Task, event: HistoryEvent, from: TaskStatus | null, to: TaskStatus | null, at: Date) {
    return tx.historyLog.create({
      data: { userId: task.ownerId, taskId: task.id, taskTitle: task.title, event, fromStatus: from, toStatus: to, at },
    });
  }

  private assertDeadlineInFuture(deadline: Date, now: Date): void {
    if (deadline.getTime() < now.getTime() + config.minDeadlineLeadSeconds * 1000) throw TaskErrors.deadlineTooSoon();
  }
}
