import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HistoryService } from './history.service';
import { OverdueJob } from './overdue.job';
import { OverdueService } from './overdue.service';
import { HistoryController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [TasksController, HistoryController],
  providers: [TasksService, HistoryService, OverdueService, OverdueJob],
  exports: [OverdueService],
})
export class TasksModule {}
