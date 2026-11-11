import { Controller, Get, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';

/** Verificare folosită de serviciul de hosting. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new AppError(HttpStatus.SERVICE_UNAVAILABLE, 'DATABASE_UNAVAILABLE', 'Baza de date nu răspunde');
    }
    return { status: 'ok' };
  }
}
