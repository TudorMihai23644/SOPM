import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { UsersModule } from './users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [MeController],
})
export class MeModule {}
