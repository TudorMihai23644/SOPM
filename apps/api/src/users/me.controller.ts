import { Controller, Get, UseGuards } from '@nestjs/common';
import type { MeDto } from '@deadlinehero/shared';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUserId() userId: string): Promise<MeDto> {
    return this.users.getMe(userId);
  }
}
