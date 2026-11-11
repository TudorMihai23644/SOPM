import { OverdueService } from '../src/tasks/overdue.service';
import { createTestApp, HOUR, MINUTE, SECOND, signUp, type TestContext } from './helpers';

describe('Activități (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    ctx.clock.set('2026-12-15T10:00:00.000Z');
    await ctx.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const inHours = (hours: number) => new Date(ctx.clock.now().getTime() + hours * HOUR).toISOString();
  const newTask = (overrides: object = {}) => ({
    title: 'Tema la SOPM',
    deadlineAt: inHours(2),
    difficulty: 'MEDIUM',
    ...overrides,
  });

  async function events(userId: string) {
    const rows = await ctx.prisma.historyLog.findMany({ where: { userId }, orderBy: [{ at: 'asc' }, { seq: 'asc' }] });
    return rows.map((r) => r.event);
  }

  describe('creare', () => {
    it('creează o activitate în starea Urmează și o scrie în Log', async () => {
      const ana = await signUp(ctx.server);
      const res = await ana.post('/tasks', newTask({ description: 'Capitolul 3' })).expect(201);

      expect(res.body).toMatchObject({
        title: 'Tema la SOPM',
        description: 'Capitolul 3',
        difficulty: 'MEDIUM',
        status: 'UPCOMING',
        postponeCount: 0,
        postponesLeft: 2,
        undoAvailableUntil: null,
      });
      expect(await events(ana.id)).toEqual(['CREATED']);
    });

    it('cere titlu, termen și dificultate valide', async () => {
      const ana = await signUp(ctx.server);
      const noTitle = await ana.post('/tasks', newTask({ title: ' ' })).expect(400);
      expect(noTitle.body.details[0].path).toBe('title');
      await ana.post('/tasks', newTask({ deadlineAt: 'mâine' })).expect(400);
      await ana.post('/tasks', newTask({ difficulty: 'EXTREM' })).expect(400);
    });

    it('cere un termen cu cel puțin un minut în viitor, după ceasul serverului', async () => {
      const ana = await signUp(ctx.server);
      const past = await ana.post('/tasks', newTask({ deadlineAt: inHours(-1) })).expect(400);
      expect(past.body.details[0].path).toBe('deadlineAt');
      const soon = new Date(ctx.clock.now().getTime() + 30 * SECOND).toISOString();
      await ana.post('/tasks', newTask({ deadlineAt: soon })).expect(400);
    });

    it('limitează activitățile create pe zi de joc la 30, chiar dacă se șterg', async () => {
      const ana = await signUp(ctx.server);
      await ctx.prisma.historyLog.createMany({
        data: Array.from({ length: 30 }, () => ({
          userId: ana.id,
          taskTitle: 'veche',
          event: 'CREATED',
          at: ctx.clock.now(),
        })),
      });
      const res = await ana.post('/tasks', newTask()).expect(429);
      expect(res.body.code).toBe('DAILY_TASK_LIMIT');

      // A doua zi de joc începe la 04:00 ora României (02:00 UTC iarna).
      ctx.clock.set('2026-12-16T02:00:00.000Z');
      await ana.post('/tasks', newTask()).expect(201);
    });

    it('limitează activitățile active la 100', async () => {
      const ana = await signUp(ctx.server);
      await ctx.prisma.task.createMany({
        data: Array.from({ length: 100 }, (_, i) => ({
          ownerId: ana.id,
          title: `T${i}`,
          deadlineAt: new Date(inHours(5)),
          difficulty: 'EASY' as const,
        })),
      });
      const res = await ana.post('/tasks', newTask()).expect(409);
      expect(res.body.code).toBe('TOO_MANY_ACTIVE_TASKS');
    });
  });

  describe('listare și izolarea datelor', () => {
    it('listează doar activitățile proprii, filtrate și ordonate după termen', async () => {
      const ana = await signUp(ctx.server);
      const bogdan = await signUp(ctx.server);
      await ana.post('/tasks', newTask({ title: 'A doua', deadlineAt: inHours(5) })).expect(201);
      await ana.post('/tasks', newTask({ title: 'Prima', deadlineAt: inHours(1) })).expect(201);
      await bogdan.post('/tasks', newTask({ title: 'A lui Bogdan' })).expect(201);

      const list = await ana.get('/tasks?status=UPCOMING,OVERDUE').expect(200);
      expect(list.body.items.map((t: { title: string }) => t.title)).toEqual(['Prima', 'A doua']);
      expect(list.body.nextCursor).toBeNull();
    });

    it('paginează cu cursor', async () => {
      const ana = await signUp(ctx.server);
      for (let i = 1; i <= 3; i += 1) await ana.post('/tasks', newTask({ title: `T${i}`, deadlineAt: inHours(i) }));
      const first = await ana.get('/tasks?limit=2').expect(200);
      expect(first.body.items).toHaveLength(2);
      const second = await ana.get(`/tasks?limit=2&cursor=${first.body.nextCursor}`).expect(200);
      expect(second.body.items.map((t: { title: string }) => t.title)).toEqual(['T3']);
      expect(second.body.nextCursor).toBeNull();
    });

    it('nu lasă un alt utilizator să vadă sau să modifice activitatea', async () => {
      const ana = await signUp(ctx.server);
      const bogdan = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);

      await bogdan.get(`/tasks/${task.id}`).expect(404);
      await bogdan.patch(`/tasks/${task.id}`, { title: 'furat' }).expect(404);
      await bogdan.post(`/tasks/${task.id}/complete`).expect(404);
      await bogdan.post(`/tasks/${task.id}/cancel`).expect(404);
      await bogdan.post(`/tasks/${task.id}/undo`).expect(404);
      await bogdan.delete(`/tasks/${task.id}`).expect(404);
      expect((await bogdan.get('/tasks').expect(200)).body.items).toEqual([]);
      expect((await bogdan.get('/history').expect(200)).body.items).toEqual([]);

      const still = await ana.get(`/tasks/${task.id}`).expect(200);
      expect(still.body).toMatchObject({ title: 'Tema la SOPM', status: 'UPCOMING' });
    });

    it('tratează un id invalid ca inexistent', async () => {
      const ana = await signUp(ctx.server);
      const res = await ana.get('/tasks/nu-e-uuid').expect(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });

    it('cere autentificare', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      const request = (await import('supertest')).default;
      await request(ctx.server).get(`/api/v1/tasks/${task.id}`).expect(401);
    });
  });

  describe('stări și tranziții', () => {
    it('completează o activitate la timp, o singură dată', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      ctx.clock.advance(5 * MINUTE);

      const done = await ana.post(`/tasks/${task.id}/complete`).expect(200);
      expect(done.body).toMatchObject({ status: 'COMPLETED', completedAt: ctx.clock.now().toISOString() });
      expect(done.body.undoAvailableUntil).toBe(new Date(ctx.clock.now().getTime() + 10 * SECOND).toISOString());

      const again = await ana.post(`/tasks/${task.id}/complete`).expect(409);
      expect(again.body.code).toBe('TASK_NOT_ACTIVE');
      expect(await events(ana.id)).toEqual(['CREATED', 'COMPLETED']);
    });

    it('anulează o activitate activă', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      const res = await ana.post(`/tasks/${task.id}/cancel`).expect(200);
      expect(res.body.status).toBe('CANCELLED');
      await ana.post(`/tasks/${task.id}/complete`).expect(409);
      expect(await events(ana.id)).toEqual(['CREATED', 'CANCELLED']);
    });

    it('Undo în 10 secunde revine la starea anterioară, o singură dată', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);

      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      ctx.clock.advance(9 * SECOND);
      const undone = await ana.post(`/tasks/${task.id}/undo`).expect(200);
      expect(undone.body).toMatchObject({ status: 'UPCOMING', completedAt: null });

      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      const second = await ana.post(`/tasks/${task.id}/undo`).expect(409);
      expect(second.body.code).toBe('UNDO_NOT_AVAILABLE');
      expect(await events(ana.id)).toEqual(['CREATED', 'COMPLETED', 'UNDONE', 'COMPLETED']);
    });

    it('Undo după 10 secunde este refuzat', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      ctx.clock.advance(11 * SECOND);
      await ana.post(`/tasks/${task.id}/undo`).expect(409);
      expect((await ana.get(`/tasks/${task.id}`)).body.undoAvailableUntil).toBeNull();
    });

    it('nu acceptă Undo pentru o activitate anulată', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      await ana.post(`/tasks/${task.id}/cancel`).expect(200);
      await ana.post(`/tasks/${task.id}/undo`).expect(409);
    });

    it('șterge definitiv, iar Log-ul păstrează titlul', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ title: 'De șters' })).expect(201);
      await ana.delete(`/tasks/${task.id}`).expect(204);
      await ana.get(`/tasks/${task.id}`).expect(404);

      const history = await ana.get('/history').expect(200);
      expect(history.body.items[0]).toMatchObject({ event: 'DELETED', taskId: null, taskTitle: 'De șters' });
    });
  });

  describe('editare și amânare', () => {
    it('editează titlul și descrierea fără să conteze ca amânare', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      const res = await ana.patch(`/tasks/${task.id}`, { title: 'Titlu nou', description: '' }).expect(200);
      expect(res.body).toMatchObject({ title: 'Titlu nou', description: null, postponeCount: 0 });
    });

    it('nu permite schimbarea dificultății', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      await ana.patch(`/tasks/${task.id}`, { difficulty: 'HARD' }).expect(400);
    });

    it('permite cel mult 2 amânări', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);

      await ana.patch(`/tasks/${task.id}`, { deadlineAt: inHours(3) }).expect(200);
      const second = await ana.patch(`/tasks/${task.id}`, { deadlineAt: inHours(4) }).expect(200);
      expect(second.body).toMatchObject({ postponeCount: 2, postponesLeft: 0 });

      const third = await ana.patch(`/tasks/${task.id}`, { deadlineAt: inHours(5) }).expect(409);
      expect(third.body.code).toBe('POSTPONE_LIMIT_REACHED');

      // Un termen mai devreme nu e amânare.
      await ana.patch(`/tasks/${task.id}`, { deadlineAt: inHours(1) }).expect(200);
      expect(await events(ana.id)).toEqual(['CREATED', 'POSTPONED', 'POSTPONED']);
    });

    it('nu permite editarea unei activități finalizate', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask()).expect(201);
      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      const res = await ana.patch(`/tasks/${task.id}`, { title: 'Alt titlu' }).expect(409);
      expect(res.body.code).toBe('TASK_NOT_EDITABLE');
    });
  });

  describe('Restant', () => {
    it('devine Restant la citire, după termen, cu momentul termenului în Log', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);

      ctx.clock.advance(3 * HOUR);
      const res = await ana.get(`/tasks/${task.id}`).expect(200);
      expect(res.body).toMatchObject({ status: 'OVERDUE', overdueAt: task.deadlineAt });

      const history = await ana.get('/history').expect(200);
      expect(history.body.items[0]).toMatchObject({ event: 'OVERDUE', at: task.deadlineAt });
    });

    it('job-ul overdue-scan procesează toți utilizatorii, o singură dată', async () => {
      const ana = await signUp(ctx.server);
      const bogdan = await signUp(ctx.server);
      await ana.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);
      await bogdan.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);
      await bogdan.post('/tasks', newTask({ deadlineAt: inHours(5) })).expect(201);

      ctx.clock.advance(2 * HOUR);
      const overdue = ctx.app.get(OverdueService);
      expect(await overdue.markAllOverdue()).toBe(2);
      expect(await overdue.markAllOverdue()).toBe(0);
      expect(await events(ana.id)).toEqual(['CREATED', 'OVERDUE']);
    });

    it('o activitate restantă se poate finaliza târziu sau anula, dar nu edita', async () => {
      const ana = await signUp(ctx.server);
      const { body: late } = await ana.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);
      const { body: other } = await ana.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);
      ctx.clock.advance(2 * HOUR);

      await ana.patch(`/tasks/${late.id}`, { deadlineAt: inHours(5) }).expect(409);
      const done = await ana.post(`/tasks/${late.id}/complete`).expect(200);
      expect(done.body.status).toBe('COMPLETED');
      await ana.post(`/tasks/${other.id}/cancel`).expect(200);

      const history = await ana.get(`/history?taskId=${late.id}`).expect(200);
      expect(history.body.items.map((e: { event: string }) => e.event)).toEqual(['COMPLETED_LATE', 'OVERDUE', 'CREATED']);
    });

    it('Undo pe o activitate finalizată târziu o readuce în Restant', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ deadlineAt: inHours(1) })).expect(201);
      ctx.clock.advance(2 * HOUR);
      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      const res = await ana.post(`/tasks/${task.id}/undo`).expect(200);
      expect(res.body.status).toBe('OVERDUE');
    });
  });
});
