import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { QuestsService } from './quests.service';

/** quest-overdue-scan (la 1 minut) și review-timeout (la 15 minute); ambele sunt idempotente. */
@Injectable()
export class QuestJobs {
  private readonly logger = new Logger('quest-jobs');
  private running = { overdue: false, review: false };

  constructor(private readonly quests: QuestsService) {}

  @Interval('quest-overdue-scan', 60_000)
  async overdueScan(): Promise<void> {
    await this.guard('overdue', async () => {
      const count = await this.quests.markOverdue();
      if (count > 0) this.logger.log(`${count} participanți au devenit restanți`);
    });
  }

  @Interval('review-timeout', 15 * 60_000)
  async reviewTimeout(): Promise<void> {
    await this.guard('review', async () => {
      const count = await this.quests.autoValidate();
      if (count > 0) this.logger.log(`${count} completări validate automat după 48 h`);
    });
  }

  private async guard(key: keyof QuestJobs['running'], work: () => Promise<void>): Promise<void> {
    if (this.running[key]) return;
    this.running[key] = true;
    try {
      await work();
    } catch (error) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    } finally {
      this.running[key] = false;
    }
  }
}
