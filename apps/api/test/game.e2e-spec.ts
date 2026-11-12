import { OverdueService } from '../src/tasks/overdue.service';
import { createTestApp, HOUR, MINUTE, SECOND, signUp, type TestContext } from './helpers';

describe('Gamificare (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    // 12:00 ora României.
    ctx.clock.set('2026-12-15T10:00:00.000Z');
    await ctx.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const inHours = (hours: number) => new Date(ctx.clock.now().getTime() + hours * HOUR).toISOString();

  async function player() {
    const client = await signUp(ctx.server);
    const create = async (difficulty = 'MEDIUM', hours = 2) =>
      (await client.post('/tasks', { title: `Misiune ${difficulty}`, deadlineAt: inHours(hours), difficulty }).expect(201)).body;
    const me = async () => (await client.get('/me').expect(200)).body;
    return { ...client, create, me };
  }

  /** Soldul din users trebuie să fie egal cu valoarea de start plus suma registrului. */
  async function expectLedgerMatches(userId: string) {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const sums = await ctx.prisma.rewardLedger.groupBy({ by: ['kind'], where: { userId }, _sum: { delta: true } });
    const sum = (kind: string) => sums.find((s) => s.kind === kind)?._sum.delta ?? 0;
    expect(user.xpTotal).toBe(sum('XP'));
    expect(user.coins).toBe(sum('COINS'));
    expect(user.hp).toBe(100 + sum('HP'));
  }

  it('o finalizare la timp dă XP, monede, COMBO ×1,05 și pornește seria', async () => {
    const ana = await player();
    const task = await ana.create('MEDIUM');
    ctx.clock.advance(5 * MINUTE);

    const res = await ana.post(`/tasks/${task.id}/complete`).expect(200);
    // Prima zi de serie: 25 × 1,05 = 26 XP.
    expect(res.body.reward).toMatchObject({ xp: 26, coins: 10, hp: 0, multiplier: 1.05, levelsGained: 0, tooFast: false });
    expect(res.body.user).toMatchObject({ xpTotal: 26, coins: 10, hp: 100, streakDays: 1, staminaUsed: 26 });
    await expectLedgerMatches(ana.id);
  });

  it('sub 60 de secunde de la creare nu dă nimic și notează motivul în Log', async () => {
    const ana = await player();
    const task = await ana.create();
    ctx.clock.advance(30 * SECOND);

    const res = await ana.post(`/tasks/${task.id}/complete`).expect(200);
    expect(res.body.reward).toMatchObject({ xp: 0, coins: 0, tooFast: true });
    expect(res.body.user).toMatchObject({ xpTotal: 0, streakDays: 0 });
    const log = await ana.get(`/history?taskId=${task.id}`).expect(200);
    expect(log.body.items[0]).toMatchObject({ event: 'COMPLETED', note: 'TOO_FAST' });
  });

  it('recompensa se acordă o singură dată, chiar și la cereri simultane', async () => {
    const ana = await player();
    const task = await ana.create('HARD');
    ctx.clock.advance(5 * MINUTE);

    const results = await Promise.all([1, 2, 3].map(() => ana.post(`/tasks/${task.id}/complete`)));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    expect((await ana.me()).xpTotal).toBe(52);
    await expectLedgerMatches(ana.id);
  });

  it('Undo retrage recompensa și Stamina; refinalizarea o acordă din nou', async () => {
    const ana = await player();
    const task = await ana.create('HARD');
    ctx.clock.advance(5 * MINUTE);

    await ana.post(`/tasks/${task.id}/complete`).expect(200);
    const undone = await ana.post(`/tasks/${task.id}/undo`).expect(200);
    expect(undone.body.user).toMatchObject({ xpTotal: 0, coins: 0, staminaUsed: 0 });

    const again = await ana.post(`/tasks/${task.id}/complete`).expect(200);
    expect(again.body.reward.xp).toBe(52);
    expect(again.body.user.xpTotal).toBe(52);
    await expectLedgerMatches(ana.id);
  });

  it('plafonul Stamina oprește XP-ul la 150 pe zi de joc, apoi se resetează la 04:00', async () => {
    const ana = await player();
    const tasks = [];
    for (let i = 0; i < 4; i += 1) tasks.push(await ana.create('HARD'));
    ctx.clock.advance(5 * MINUTE);

    const rewards = [];
    for (const task of tasks) rewards.push((await ana.post(`/tasks/${task.id}/complete`).expect(200)).body.reward.xp);
    // 50 × 1,05 = 52, de trei ori = 156 > 150: a treia primește doar 46, a patra nimic.
    expect(rewards).toEqual([52, 52, 46, 0]);
    expect((await ana.me()).staminaUsed).toBe(150);

    // A doua zi, ora 04:00 în România (02:00 UTC iarna): plafonul e din nou liber, iar seria crește.
    ctx.clock.set('2026-12-16T02:00:00.000Z');
    const next = await ana.create('EASY');
    ctx.clock.advance(5 * MINUTE);
    const res = await ana.post(`/tasks/${next.id}/complete`).expect(200);
    expect(res.body.reward).toMatchObject({ xp: 11, multiplier: 1.1 });
    expect(res.body.user).toMatchObject({ streakDays: 2, staminaUsed: 11 });
  });

  it('urcarea în nivel dă 25 de monede', async () => {
    const ana = await player();
    await ctx.prisma.user.update({ where: { id: ana.id }, data: { xpTotal: 90 } });
    await ctx.prisma.rewardLedger.create({
      data: { userId: ana.id, kind: 'XP', delta: 90, reason: 'SEED', refType: 'TEST', refId: '1' },
    });
    const task = await ana.create('MEDIUM');
    ctx.clock.advance(5 * MINUTE);

    const res = await ana.post(`/tasks/${task.id}/complete`).expect(200);
    expect(res.body.reward).toMatchObject({ xp: 26, coins: 35, levelsGained: 1, level: 2 });
    expect(res.body.user).toMatchObject({ level: 2, xpInLevel: 16, coins: 35 });
    await expectLedgerMatches(ana.id);
  });

  it('o activitate restantă scade HP o singură dată, după dificultate', async () => {
    const ana = await player();
    await ana.create('HARD', 1);
    await ana.create('EASY', 1);
    ctx.clock.advance(2 * HOUR);

    expect((await ana.me()).hp).toBe(100);
    await ana.get('/tasks').expect(200);
    expect((await ana.me()).hp).toBe(80);

    await ctx.app.get(OverdueService).markAllOverdue();
    await ana.get('/tasks').expect(200);
    expect((await ana.me()).hp).toBe(80);
    await expectLedgerMatches(ana.id);
  });

  it('finalizarea târzie dă 25% XP, fără monede și fără să prelungească seria', async () => {
    const ana = await player();
    const task = await ana.create('HARD', 1);
    ctx.clock.advance(2 * HOUR);

    const res = await ana.post(`/tasks/${task.id}/complete`).expect(200);
    expect(res.body.reward).toMatchObject({ xp: 12, coins: 0, hp: 0, multiplier: 1 });
    expect(res.body.user).toMatchObject({ hp: 85, streakDays: 0 });
  });

  it('la 0 HP: KO, −20% monede și HP revine la 50, o singură dată', async () => {
    const ana = await player();
    await ctx.prisma.user.update({ where: { id: ana.id }, data: { hp: 10, coins: 99 } });
    await ctx.prisma.rewardLedger.createMany({
      data: [
        { userId: ana.id, kind: 'HP', delta: -90, reason: 'SEED', refType: 'TEST', refId: '1' },
        { userId: ana.id, kind: 'COINS', delta: 99, reason: 'SEED', refType: 'TEST', refId: '1' },
      ],
    });
    const task = await ana.create('HARD', 1);
    ctx.clock.advance(2 * HOUR);

    await ctx.app.get(OverdueService).markAllOverdue();
    await ctx.app.get(OverdueService).markAllOverdue();
    expect(await ana.me()).toMatchObject({ hp: 50, coins: 80 });

    const log = await ana.get(`/history?taskId=${task.id}`).expect(200);
    expect(log.body.items[0]).toMatchObject({ event: 'OVERDUE', note: 'KO' });
    await expectLedgerMatches(ana.id);
  });

  it('seria se pierde după o zi fără finalizări', async () => {
    const ana = await player();
    const first = await ana.create('EASY', 2);
    ctx.clock.advance(5 * MINUTE);
    await ana.post(`/tasks/${first.id}/complete`).expect(200);
    expect((await ana.me()).streakDays).toBe(1);

    ctx.clock.set('2026-12-17T10:00:00.000Z');
    expect(await ana.me()).toMatchObject({ streakDays: 0, comboMultiplier: 1.05 });
  });
});
