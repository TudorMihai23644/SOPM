import { Injectable } from '@nestjs/common';
import type { HistoryEntryDto, Page } from '@deadlinehero/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OverdueService } from './overdue.service';
import { toHistoryDto } from './task.mapper';
import type { HistoryQuery } from './tasks.query';

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overdue: OverdueService,
  ) {}

  async list(userId: string, query: HistoryQuery): Promise<Page<HistoryEntryDto>> {
    await this.overdue.markAllOverdue(userId);
    const entries = await this.prisma.historyLog.findMany({
      where: { userId, ...(query.taskId ? { taskId: query.taskId } : {}) },
      orderBy: [{ at: 'desc' }, { seq: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = entries.length > query.limit;
    const items = entries.slice(0, query.limit);
    return { items: items.map(toHistoryDto), nextCursor: hasMore ? items[items.length - 1].id : null };
  }
}
