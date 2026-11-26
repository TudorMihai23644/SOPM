import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestJobs } from './quest.jobs';
import { QuestsService } from './quests.service';
import { RealtimeGateway } from './realtime.gateway';
import { QuestsController, TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuthModule],
  controllers: [TeamsController, QuestsController],
  providers: [TeamsService, QuestsService, RealtimeGateway, QuestJobs],
  exports: [TeamsService, RealtimeGateway],
})
export class TeamsModule {}
