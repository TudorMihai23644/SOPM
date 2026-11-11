import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OverdueService } from './overdue.service';

/** Job-ul overdue-scan: rulează la fiecare minut. */
@Injectable()
export class OverdueJob {
  private readonly logger = new Logger('overdue-scan');
  private running = false;

  constructor(private readonly overdue: OverdueService) {}

  @Interval('overdue-scan', 60_000)
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.overdue.markAllOverdue();
      if (count > 0) this.logger.log(`${count} activități au devenit restante`);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
