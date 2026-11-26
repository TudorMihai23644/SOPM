import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamsModule } from '../teams/teams.module';
import { MeController } from './me.controller';
import { ProfileService } from './profile.service';
import { RolloverJob } from './rollover.job';
import { RolloverService } from './rollover.service';
import { UsersModule } from './users.module';

@Module({
  imports: [AuthModule, UsersModule, TeamsModule],
  controllers: [MeController],
  providers: [ProfileService, RolloverService, RolloverJob],
  exports: [RolloverService],
})
export class MeModule {}
