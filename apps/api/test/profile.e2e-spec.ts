import request from 'supertest';
import { MailService } from '../src/auth/mail.service';
import { RolloverService } from '../src/users/rollover.service';
import { API, createTestApp, HOUR, MINUTE, signUp, type TestContext } from './helpers';

describe('Profil, confidențialitate și ziua de joc (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    ctx.clock.set('2026-12-15T10:00:00.000Z');
    await ctx.prisma.team.deleteMany();
    await ctx.prisma.user.deleteMany();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const login = (email: string, password: string) =>
    request(ctx.server).post(`${API}/auth/login`).send({ email, password });

  it('PATCH /me schimbă porecla și fusul orar; porecla ocupată dă eroare lângă câmp', async () => {
    const ana = await signUp(ctx.server, 'ana_p');
    await signUp(ctx.server, 'bob_p');
    const res = await ana.patch('/me', { nickname: 'ana_noua', timezone: 'Europe/London' }).expect(200);
    expect(res.body).toMatchObject({ nickname: 'ana_noua', timezone: 'Europe/London' });
    const taken = await ana.patch('/me', { nickname: 'bob_p' }).expect(409);
    expect(taken.body.details[0].path).toBe('nickname');
    await ana.patch('/me', { email: 'x@y.ro' }).expect(400);
  });

  it('schimbarea parolei verifică parola veche și închide celelalte sesiuni', async () => {
    const ana = await signUp(ctx.server, 'ana_pw');
    await ana.post('/auth/change-password', { currentPassword: 'gresita-123', newPassword: 'parola-noua-123' }).expect(401);
    const res = await ana.post('/auth/change-password', { currentPassword: 'parola-lunga-1', newPassword: 'parola-noua-123' }).expect(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    await login('ana_pw@example.com', 'parola-lunga-1').expect(401);
    await login('ana_pw@example.com', 'parola-noua-123').expect(200);
    const sessions = await ctx.prisma.refreshToken.findMany({ where: { revokedAt: null } });
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('resetarea parolei: link de unică folosință, același răspuns pentru emailuri inexistente', async () => {
    await signUp(ctx.server, 'ana_rs');
    const mail = jest.spyOn(ctx.app.get(MailService), 'sendPasswordReset');
    await request(ctx.server).post(`${API}/auth/forgot-password`).send({ email: 'nimeni@example.com' }).expect(204);
    expect(mail).not.toHaveBeenCalled();

    await request(ctx.server).post(`${API}/auth/forgot-password`).send({ email: 'ana_rs@example.com' }).expect(204);
    const link = mail.mock.calls[0][1];
    const token = new URL(link).searchParams.get('token');
    const reset = { token, newPassword: 'parola-resetata-1' };
    await request(ctx.server).post(`${API}/auth/reset-password`).send(reset).expect(204);
    await request(ctx.server).post(`${API}/auth/reset-password`).send(reset).expect(400);
    await login('ana_rs@example.com', 'parola-resetata-1').expect(200);
    mail.mockRestore();
  });

  it('aplicația mobilă primește refresh token-ul în corp și îl poate roti fără cookie', async () => {
    await signUp(ctx.server, 'ana_mob');
    const first = await request(ctx.server)
      .post(`${API}/auth/login`)
      .set('x-client', 'mobile')
      .send({ email: 'ana_mob@example.com', password: 'parola-lunga-1' })
      .expect(200);
    expect(first.body.refreshToken).toEqual(expect.any(String));

    const web = await login('ana_mob@example.com', 'parola-lunga-1').expect(200);
    expect(web.body.refreshToken).toBeUndefined();

    const rotated = await request(ctx.server)
      .post(`${API}/auth/refresh`)
      .set('x-client', 'mobile')
      .send({ refreshToken: first.body.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(first.body.refreshToken);
    // Tokenul vechi nu mai merge (rotație).
    await request(ctx.server).post(`${API}/auth/refresh`).send({ refreshToken: first.body.refreshToken }).expect(401);
  });

  it('exportul JSON conține profilul, activitățile și istoricul, fără parola', async () => {
    const ana = await signUp(ctx.server, 'ana_ex');
    await ana.post('/tasks', { title: 'Referat', deadlineAt: new Date(ctx.clock.now().getTime() + HOUR).toISOString(), difficulty: 'EASY' }).expect(201);
    const res = await ana.get('/me/export').expect(200);
    expect(res.headers['content-disposition']).toContain('deadlinehero-export.json');
    expect(res.body.profile).toMatchObject({ nickname: 'ana_ex', email: 'ana_ex@example.com' });
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.history[0]).toMatchObject({ event: 'CREATED' });
    expect(JSON.stringify(res.body)).not.toContain('argon2');
  });

  it('ștergerea contului cere parola, șterge datele și iese din echipă', async () => {
    const ana = await signUp(ctx.server, 'ana_del');
    const bob = await signUp(ctx.server, 'bob_del');
    const team = await ana.post('/teams', { name: 'Ghilda' }).expect(201);
    await bob.post('/teams/join', { code: team.body.inviteCode }).expect(200);

    await request(ctx.server).delete(`${API}/me`).set('Authorization', 'Bearer x').send({ password: 'x' }).expect(401);
    await ana.delete('/me').send({ password: 'gresita-123' }).expect(401);
    await ana.delete('/me').send({ password: 'parola-lunga-1' }).expect(204);

    await login('ana_del@example.com', 'parola-lunga-1').expect(401);
    expect(await ctx.prisma.task.count({ where: { owner: { nickname: 'ana_del' } } })).toBe(0);
    const left = await bob.get('/teams/me').expect(200);
    expect(left.body.team).toMatchObject({ leaderId: bob.id });
    expect(left.body.team.members).toHaveLength(1);
  });

  describe('daily-rollover', () => {
    it('o zi curată dă +10 HP la 04:00 local, o singură dată', async () => {
      const ana = await signUp(ctx.server, 'ana_day');
      const rollover = ctx.app.get(RolloverService);
      // Prima rulare doar deschide ziua.
      await rollover.run();
      await ctx.prisma.user.update({ where: { id: ana.id }, data: { hp: 70 } });

      const task = await ana.post('/tasks', { title: 'Lab', deadlineAt: new Date(ctx.clock.now().getTime() + 5 * HOUR).toISOString(), difficulty: 'EASY' }).expect(201);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/tasks/${task.body.id}/complete`).expect(200);
      expect((await ana.get('/me').expect(200)).body.hp).toBe(75);

      // 05:00 ora României a doua zi.
      ctx.clock.set('2026-12-16T03:00:00.000Z');
      expect(await rollover.run()).toBe(1);
      expect(await rollover.run()).toBe(0);
      expect((await ana.get('/me').expect(200)).body.hp).toBe(85);
    });

    it('o activitate nou restantă strică ziua curată', async () => {
      const ana = await signUp(ctx.server, 'ana_bad');
      const rollover = ctx.app.get(RolloverService);
      await rollover.run();
      const done = await ana.post('/tasks', { title: 'A', deadlineAt: new Date(ctx.clock.now().getTime() + 5 * HOUR).toISOString(), difficulty: 'EASY' }).expect(201);
      await ana.post('/tasks', { title: 'B', deadlineAt: new Date(ctx.clock.now().getTime() + HOUR).toISOString(), difficulty: 'EASY' }).expect(201);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/tasks/${done.body.id}/complete`).expect(200);
      ctx.clock.advance(2 * HOUR);
      await ana.get('/tasks').expect(200);

      ctx.clock.set('2026-12-16T03:00:00.000Z');
      expect(await rollover.run()).toBe(0);
    });
  });
});
