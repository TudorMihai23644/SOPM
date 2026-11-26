import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RolloverService } from './rollover.service';

/** Job-ul daily-rollover: rulează la 15 minute, pentru utilizatorii la care a trecut 04:00 local. */
@Injectable()
export class RolloverJob {
  private readonly logger = new Logger('daily-rollover');
  private running = false;

  constructor(private readonly rollover: RolloverService) {}

  @Interval('daily-rollover', 15 * 60_000)
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.rollover.run();
      if (count > 0) this.logger.log(`${count} zile curate recompensate (+10 HP)`);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}
