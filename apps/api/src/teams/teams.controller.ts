import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  createQuestSchema,
  createTeamSchema,
  joinTeamSchema,
  rejectCompletionSchema,
  type CreateQuestData,
  type MyTeamResponse,
  type QuestDto,
  type TeamDto,
} from '@deadlinehero/shared';
import type { z } from 'zod';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuestErrors, TeamErrors } from './errors';
import { QuestsService } from './quests.service';
import { TeamsService } from './teams.service';

const QuestId = () => new ParseUUIDPipe({ exceptionFactory: () => QuestErrors.notFound() });
const MemberId = () => new ParseUUIDPipe({ exceptionFactory: () => TeamErrors.memberNotFound() });

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createTeamSchema)) body: z.output<typeof createTeamSchema>,
  ): Promise<TeamDto> {
    return this.teams.create(userId, body.name);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  join(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(joinTeamSchema)) body: z.output<typeof joinTeamSchema>,
  ): Promise<TeamDto> {
    return this.teams.join(userId, body.code);
  }

  @Get('me')
  mine(@CurrentUserId() userId: string): Promise<MyTeamResponse> {
    return this.teams.getMine(userId);
  }

  @Post('me/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUserId() userId: string): Promise<void> {
    return this.teams.leave(userId);
  }

  @Delete('me/members/:userId')
  kick(@CurrentUserId() userId: string, @Param('userId', MemberId()) targetId: string): Promise<TeamDto> {
    return this.teams.kick(userId, targetId);
  }

  @Post('me/regenerate-code')
  @HttpCode(HttpStatus.OK)
  regenerate(@CurrentUserId() userId: string): Promise<TeamDto> {
    return this.teams.regenerateCode(userId);
  }
}

@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get()
  list(@CurrentUserId() userId: string): Promise<QuestDto[]> {
    return this.quests.list(userId);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createQuestSchema)) body: CreateQuestData,
  ): Promise<QuestDto> {
    return this.quests.create(userId, body);
  }

  @Post(':id/done')
  @HttpCode(HttpStatus.OK)
  done(@CurrentUserId() userId: string, @Param('id', QuestId()) id: string): Promise<QuestDto> {
    return this.quests.done(userId, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUserId() userId: string, @Param('id', QuestId()) id: string): Promise<QuestDto> {
    return this.quests.cancel(userId, id);
  }

  @Post(':id/participants/:userId/validate')
  @HttpCode(HttpStatus.OK)
  validate(
    @CurrentUserId() userId: string,
    @Param('id', QuestId()) id: string,
    @Param('userId', MemberId()) targetId: string,
  ): Promise<QuestDto> {
    return this.quests.validate(userId, id, targetId);
  }

  @Post(':id/participants/:userId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUserId() userId: string,
    @Param('id', QuestId()) id: string,
    @Param('userId', MemberId()) targetId: string,
    @Body(new ZodValidationPipe(rejectCompletionSchema)) body: z.output<typeof rejectCompletionSchema>,
  ): Promise<QuestDto> {
    return this.quests.reject(userId, id, targetId, body.reason);
  }

  @Post(':id/participants/:userId/excuse')
  @HttpCode(HttpStatus.OK)
  excuse(
    @CurrentUserId() userId: string,
    @Param('id', QuestId()) id: string,
    @Param('userId', MemberId()) targetId: string,
  ): Promise<QuestDto> {
    return this.quests.excuse(userId, id, targetId);
  }
}
