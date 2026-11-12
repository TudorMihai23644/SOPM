import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskData,
  type HistoryEntryDto,
  type Page,
  type TaskActionResponse,
  type TaskDto,
  type UpdateTaskData,
} from '@deadlinehero/shared';
import { CurrentUserId } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TaskErrors } from './errors';
import { HistoryService } from './history.service';
import { historyQuerySchema, listTasksQuerySchema, type HistoryQuery, type ListTasksQuery } from './tasks.query';
import { TasksService } from './tasks.service';

/** Un id invalid se tratează ca o activitate inexistentă (404), la fel ca una a altui utilizator. */
const TaskId = () => new ParseUUIDPipe({ exceptionFactory: () => TaskErrors.notFound() });

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery,
  ): Promise<Page<TaskDto>> {
    return this.tasks.list(userId, query);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskData,
  ): Promise<TaskDto> {
    return this.tasks.create(userId, body);
  }

  @Get(':id')
  get(@CurrentUserId() userId: string, @Param('id', TaskId()) id: string): Promise<TaskDto> {
    return this.tasks.get(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id', TaskId()) id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskData,
  ): Promise<TaskDto> {
    return this.tasks.update(userId, id, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUserId() userId: string, @Param('id', TaskId()) id: string): Promise<TaskActionResponse> {
    return this.tasks.complete(userId, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUserId() userId: string, @Param('id', TaskId()) id: string): Promise<TaskActionResponse> {
    return this.tasks.cancel(userId, id);
  }

  @Post(':id/undo')
  @HttpCode(HttpStatus.OK)
  undo(@CurrentUserId() userId: string, @Param('id', TaskId()) id: string): Promise<TaskActionResponse> {
    return this.tasks.undo(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() userId: string, @Param('id', TaskId()) id: string): Promise<void> {
    return this.tasks.remove(userId, id);
  }
}

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodValidationPipe(historyQuerySchema)) query: HistoryQuery,
  ): Promise<Page<HistoryEntryDto>> {
    return this.history.list(userId, query);
  }
}
