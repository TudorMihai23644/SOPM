import { HttpStatus } from '@nestjs/common';
import { AppError } from '../common/app-error';

export const TaskErrors = {
  notFound: () => new AppError(HttpStatus.NOT_FOUND, 'TASK_NOT_FOUND', 'Activitatea nu există'),
  notActive: () =>
    new AppError(HttpStatus.CONFLICT, 'TASK_NOT_ACTIVE', 'Activitatea este deja finalizată sau anulată'),
  notEditable: () =>
    new AppError(HttpStatus.CONFLICT, 'TASK_NOT_EDITABLE', 'Doar activitățile care urmează se pot modifica'),
  postponeLimit: () =>
    new AppError(HttpStatus.CONFLICT, 'POSTPONE_LIMIT_REACHED', 'Termenul se poate amâna de cel mult 2 ori'),
  undoNotAvailable: () =>
    new AppError(HttpStatus.CONFLICT, 'UNDO_NOT_AVAILABLE', 'Finalizarea nu mai poate fi anulată'),
  tooManyActive: (max: number) =>
    new AppError(HttpStatus.CONFLICT, 'TOO_MANY_ACTIVE_TASKS', `Poți avea cel mult ${max} activități active`),
  dailyLimit: (max: number) =>
    new AppError(HttpStatus.TOO_MANY_REQUESTS, 'DAILY_TASK_LIMIT', `Poți crea cel mult ${max} activități pe zi`),
  deadlineTooSoon: () =>
    new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', 'Termenul trebuie să fie cu cel puțin un minut în viitor', [
      { path: 'deadlineAt', message: 'Termenul trebuie să fie cu cel puțin un minut în viitor' },
    ]),
};
