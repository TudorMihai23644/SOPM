import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { MeModule } from './users/me.module';

// În teste, job-urile periodice nu pornesc singure; testele le apelează direct, cu ceas simulat.
const scheduler = process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()];

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ...scheduler,
    // 100 de cereri pe minut per IP, conform specificațiilor (în teste limita e ridicată).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 10_000 : 100 }]),
    AuthModule,
    MeModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
