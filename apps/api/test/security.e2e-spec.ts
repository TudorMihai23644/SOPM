import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { RealtimeGateway } from '../src/teams/realtime.gateway';
import { API, createTestApp, HOUR, MINUTE, signUp, type TestContext } from './helpers';

/**
 * Teste de securitate și de abuz (săptămânile 6–7): autentificare, izolarea datelor între
 * utilizatori și echipe, câmpuri care nu se pot impune din cerere, intrări ostile,
 * exploatarea regulilor jocului și canalul de timp real.
 */
describe('Securitate și abuz (e2e)', () => {
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

  const inHours = (hours: number) => new Date(ctx.clock.now().getTime() + hours * HOUR).toISOString();
  const newTask = (overrides: object = {}) => ({ title: 'Tema', deadlineAt: inHours(2), difficulty: 'MEDIUM', ...overrides });
  const secret = () => process.env.JWT_ACCESS_SECRET as string;
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function team(size = 2) {
    const members = [];
    for (let i = 0; i < size; i += 1) members.push(await signUp(ctx.server));
    const created = await members[0].post('/teams', { name: 'Ghilda' }).expect(201);
    for (const m of members.slice(1)) await m.post('/teams/join', { code: created.body.inviteCode }).expect(200);
    return { members, id: created.body.id as string };
  }

  /** Niciun răspuns de eroare nu trebuie să scape detalii interne (stack trace, SQL, căi de fișiere). */
  function expectCleanError(body: unknown) {
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/at .+\.(ts|js):\d+|prisma|node_modules|SELECT |stack/i);
  }

  describe('autentificare', () => {
    const id = randomUUID();
    const protectedRoutes: [string, string][] = [
      ['get', '/me'],
      ['patch', '/me'],
      ['get', '/me/export'],
      ['delete', '/me'],
      ['post', '/auth/change-password'],
      ['get', '/tasks'],
      ['post', '/tasks'],
      ['get', `/tasks/${id}`],
      ['patch', `/tasks/${id}`],
      ['post', `/tasks/${id}/complete`],
      ['post', `/tasks/${id}/cancel`],
      ['post', `/tasks/${id}/undo`],
      ['delete', `/tasks/${id}`],
      ['get', '/history'],
      ['post', '/teams'],
      ['post', '/teams/join'],
      ['get', '/teams/me'],
      ['post', '/teams/me/leave'],
      ['delete', `/teams/me/members/${id}`],
      ['post', '/teams/me/regenerate-code'],
      ['get', '/quests'],
      ['post', '/quests'],
      ['post', `/quests/${id}/done`],
      ['post', `/quests/${id}/cancel`],
      ['post', `/quests/${id}/participants/${id}/validate`],
      ['post', `/quests/${id}/participants/${id}/reject`],
      ['post', `/quests/${id}/participants/${id}/excuse`],
    ];

    it.each(protectedRoutes)('%s %s refuză cererile fără token', async (method, path) => {
      const res = await (request(ctx.server) as unknown as Record<string, (p: string) => request.Test>)[method](`${API}${path}`);
      expect(res.status).toBe(401);
      expectCleanError(res.body);
    });

    it('refuză tokenuri falsificate: altă cheie, algoritmul „none”, expirate sau cu semnătura modificată', async () => {
      const ana = await signUp(ctx.server);
      const jwt = new JwtService();
      const now = Math.floor(Date.now() / 1000);
      const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

      const otherKey = jwt.sign({ sub: ana.id }, { secret: 'o-alta-cheie-secreta-de-cel-putin-32-caractere' });
      const algNone = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: ana.id, iat: now })}.`;
      const expired = jwt.sign({ sub: ana.id, iat: now - 3600, exp: now - 60 }, { secret: secret() });
      const valid = jwt.sign({ sub: ana.id }, { secret: secret() });
      const [header, , signature] = valid.split('.');
      const swappedPayload = `${header}.${b64({ sub: randomUUID(), iat: now })}.${signature}`;

      for (const token of [otherKey, algNone, expired, swappedPayload, 'a.b.c', '']) {
        await request(ctx.server).get(`${API}/me`).set(bearer(token)).expect(401);
      }
      await request(ctx.server).get(`${API}/me`).set('Authorization', valid).expect(401); // fără „Bearer”
      await request(ctx.server).get(`${API}/me`).set(bearer(valid)).expect(200);
    });

    it('un token rămas după ștergerea contului nu mai dă acces și nu produce erori 500', async () => {
      const ana = await signUp(ctx.server);
      const token = new JwtService().sign({ sub: ana.id }, { secret: secret() });
      await ana.delete('/me').send({ password: 'parola-lunga-1' }).expect(204);

      for (const [method, path, body] of [
        ['get', '/me', undefined],
        ['get', '/tasks', undefined],
        ['post', '/tasks', newTask()],
        ['get', '/history', undefined],
        ['post', '/teams', { name: 'Fantoma' }],
        ['get', '/teams/me', undefined],
        ['get', '/me/export', undefined],
      ] as const) {
        const call = (request(ctx.server) as unknown as Record<string, (p: string) => request.Test>)[method](`${API}${path}`);
        const res = await call.set(bearer(token)).send(body);
        expect([401, 404]).toContain(res.status);
        expectCleanError(res.body);
      }
      expect(await ctx.prisma.task.count()).toBe(0);
      expect(await ctx.prisma.team.count()).toBe(0);
    });

    it('nu dezvăluie dacă un email are cont: același cod și același mesaj', async () => {
      await signUp(ctx.server, 'existent');
      const wrongPassword = await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: 'existent@example.com', password: 'parola-gresita-1' })
        .expect(401);
      const noAccount = await request(ctx.server)
        .post(`${API}/auth/login`)
        .send({ email: 'nimeni@example.com', password: 'parola-gresita-1' })
        .expect(401);
      expect(noAccount.body).toEqual(wrongPassword.body);

      await request(ctx.server).post(`${API}/auth/forgot-password`).send({ email: 'existent@example.com' }).expect(204);
      await request(ctx.server).post(`${API}/auth/forgot-password`).send({ email: 'nimeni@example.com' }).expect(204);
    });

    it('cookie-ul de refresh este HttpOnly, SameSite=Lax și limitat la rutele de autentificare', async () => {
      const res = await request(ctx.server)
        .post(`${API}/auth/register`)
        .send({ email: 'cookie@example.com', password: 'parola-lunga-1', nickname: 'cookie' })
        .expect(201);
      const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('dh_refresh='));
      expect(cookie).toBeDefined();
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
      // Pe web, refresh token-ul nu apare în corpul răspunsului (doar aplicația mobilă îl primește).
      expect(res.body.refreshToken).toBeUndefined();
    });

    it('niciun răspuns nu conține hash-ul parolei sau tokenuri stocate', async () => {
      const ana = await signUp(ctx.server);
      await ana.post('/tasks', newTask()).expect(201);
      for (const path of ['/me', '/me/export', '/tasks', '/history']) {
        const text = JSON.stringify((await ana.get(path).expect(200)).body);
        expect(text).not.toMatch(/passwordHash|password_hash|\$argon2|tokenHash|token_hash/);
      }
    });
  });

  describe('antete HTTP', () => {
    it('trimite antetele de securitate (helmet) și ascunde tehnologia serverului', async () => {
      const res = await request(ctx.server).get(`${API}/health`).expect(200);
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('CORS permite doar originea configurată', async () => {
      const allowed = await request(ctx.server).get(`${API}/health`).set('Origin', 'http://localhost:5173');
      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(allowed.headers['access-control-allow-credentials']).toBe('true');

      const foreign = await request(ctx.server).get(`${API}/health`).set('Origin', 'https://site-rau.example');
      expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('izolarea datelor', () => {
    it('un utilizator nu poate acționa pe quest-urile altei echipe', async () => {
      const a = await team(2);
      const b = await team(2);
      const { body: q } = await a.members[0]
        .post('/quests', { title: 'Secret', deadlineAt: inHours(4), difficulty: 'EASY' })
        .expect(201);
      const intruder = b.members[0];

      for (const path of [
        `/quests/${q.id}/done`,
        `/quests/${q.id}/cancel`,
        `/quests/${q.id}/participants/${a.members[0].id}/validate`,
        `/quests/${q.id}/participants/${a.members[0].id}/excuse`,
      ]) {
        expect((await intruder.post(path).expect(404)).body.code).toBe('QUEST_NOT_FOUND');
      }
      await intruder.post(`/quests/${q.id}/participants/${a.members[0].id}/reject`, { reason: 'sabotaj' }).expect(404);
      expect((await intruder.get('/quests').expect(200)).body).toEqual([]);

      const still = await a.members[0].get('/quests').expect(200);
      expect(still.body[0]).toMatchObject({ id: q.id, status: 'OPEN' });
    });

    it('liderul nu poate scoate din echipă pe cineva din altă echipă', async () => {
      const a = await team(2);
      const b = await team(2);
      await a.members[0].delete(`/teams/me/members/${b.members[1].id}`).expect(404);
      expect((await b.members[1].get('/teams/me').expect(200)).body.team.id).toBe(b.id);
    });

    it('cine pleacă din echipă pierde accesul la quest-urile ei', async () => {
      const { members } = await team(3);
      const [ana, bob] = members;
      const { body: q } = await ana.post('/quests', { title: 'Grup', deadlineAt: inHours(4), difficulty: 'EASY' }).expect(201);
      await bob.post('/teams/me/leave').expect(204);

      const res = await bob.post(`/quests/${q.id}/done`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect((await bob.get('/teams/me').expect(200)).body.team).toBeNull();
    });

    it('un participant nu poate marca terminat pentru altcineva și doar participanții pot marca', async () => {
      const { members } = await team(3);
      const [ana, bob, cris] = members;
      const { body: q } = await ana
        .post('/quests', { title: 'Doi', deadlineAt: inHours(4), difficulty: 'EASY', participantIds: [ana.id, bob.id] })
        .expect(201);
      ctx.clock.advance(10 * MINUTE);
      const res = await cris.post(`/quests/${q.id}/done`);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      // Cris nu e participant, deci nu are ce valida nici la el.
      await bob.post(`/quests/${q.id}/participants/${cris.id}/validate`).expect(404);
    });

    it('un participant nu poate trece de la „În lucru” direct la „Validat” fără „Terminat”', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const { body: q } = await ana.post('/quests', { title: 'Grup', deadlineAt: inHours(4), difficulty: 'EASY' }).expect(201);
      expect((await bob.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(409)).body.code).toBeDefined();
    });
  });

  describe('câmpuri care nu se pot impune din cerere', () => {
    it('la înregistrare se ignoră XP, monede, HP sau nivel trimise de client', async () => {
      const res = await request(ctx.server)
        .post(`${API}/auth/register`)
        .send({
          email: 'hacker@example.com',
          password: 'parola-lunga-1',
          nickname: 'hacker',
          xpTotal: 999999,
          coins: 999999,
          hp: 9999,
          level: 99,
          id: randomUUID(),
        })
        .expect(201);
      expect(res.body.user).toMatchObject({ xpTotal: 0, coins: 0, hp: 100, level: 1 });
    });

    it('PATCH /me refuză câmpurile jocului', async () => {
      const ana = await signUp(ctx.server);
      for (const body of [{ coins: 1000 }, { hp: 999 }, { xpTotal: 5000 }, { email: 'alt@example.com' }, { nickname: 'nou', coins: 5 }]) {
        await ana.patch('/me', body).expect(400);
      }
      expect((await ana.get('/me').expect(200)).body).toMatchObject({ coins: 0, hp: 100, xpTotal: 0 });
    });

    it('o activitate nu se poate crea în contul altcuiva și nu i se pot schimba starea sau dificultatea prin PATCH', async () => {
      const ana = await signUp(ctx.server);
      const bob = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ userId: bob.id, status: 'COMPLETED' })).expect(201);
      expect(task.status).toBe('UPCOMING');
      expect((await bob.get('/tasks').expect(200)).body.items).toEqual([]);

      for (const body of [{ status: 'COMPLETED' }, { difficulty: 'HARD' }, { userId: bob.id }, { postponeCount: 0 }]) {
        await ana.patch(`/tasks/${task.id}`, body).expect(400);
      }
      expect((await ana.get(`/tasks/${task.id}`).expect(200)).body).toMatchObject({ status: 'UPCOMING', difficulty: 'MEDIUM' });
    });
  });

  describe('intrări ostile', () => {
    it('textele cu SQL sau HTML se salvează exact ca text, fără efecte', async () => {
      const ana = await signUp(ctx.server);
      const sql = "x'); DROP TABLE tasks; --";
      const html = '<img src=x onerror="alert(1)">';
      await ana.post('/tasks', newTask({ title: sql })).expect(201);
      const res = await ana.post('/tasks', newTask({ title: html, description: '<script>alert(1)</script>' })).expect(201);
      expect(res.headers['content-type']).toMatch(/application\/json/);

      const titles = (await ana.get('/tasks').expect(200)).body.items.map((t: { title: string }) => t.title);
      expect(titles).toEqual(expect.arrayContaining([sql, html]));
      expect(await ctx.prisma.task.count()).toBe(2);
    });

    it('codurile de invitație cu caractere speciale sunt refuzate curat', async () => {
      const ana = await signUp(ctx.server);
      for (const code of ["' OR 1", "'--;--", '%%%%%%', 'ZZZZZZ', '', 'A'.repeat(500)]) {
        const res = await ana.post('/teams/join', { code });
        expect([400, 404]).toContain(res.status);
        expectCleanError(res.body);
      }
      expect((await ana.get('/teams/me').expect(200)).body.team).toBeNull();
    });

    it('refuză texte prea lungi și tipuri greșite cu 400', async () => {
      const ana = await signUp(ctx.server);
      for (const body of [
        newTask({ title: 'x'.repeat(10_000) }),
        newTask({ description: 'x'.repeat(100_000) }),
        newTask({ difficulty: 'IMPOSSIBLE' }),
        newTask({ deadlineAt: 'mâine' }),
        newTask({ title: { $ne: null } }),
        newTask({ title: ['a', 'b'] }),
      ]) {
        const res = await ana.post('/tasks', body);
        expect(res.status).toBe(400);
        expectCleanError(res.body);
      }
      await ana.post('/teams', { name: 'x'.repeat(1000) }).expect(400);
      await ana.post('/auth/change-password', { currentPassword: 'parola-lunga-1', newPassword: 'x'.repeat(5000) }).expect(400);
    });

    it('JSON invalid și corpuri uriașe primesc un răspuns de eroare curat, nu un 500', async () => {
      const ana = await signUp(ctx.server);
      const { body } = await ana.post('/tasks', newTask()).expect(201);

      const malformed = await request(ctx.server)
        .post(`${API}/auth/login`)
        .set('Content-Type', 'application/json')
        .send('{"email": "a@b.ro", "password": ');
      expect(malformed.status).toBe(400);
      expectCleanError(malformed.body);
      expect(malformed.text).not.toMatch(/<html|<pre>/i);

      const huge = await request(ctx.server)
        .post(`${API}/auth/login`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ email: 'a@b.ro', password: 'x'.repeat(2_000_000) }));
      expect(huge.status).toBe(413);
      expectCleanError(huge.body);
      expect(huge.text).not.toMatch(/<html|<pre>/i);

      expect((await ana.get(`/tasks/${body.id}`).expect(200)).body.id).toBe(body.id);
    });

    it('identificatorii invalizi din URL dau 404, nu 500', async () => {
      const { members } = await team(2);
      for (const path of [
        '/quests/nu-e-uuid/done',
        "/quests/1' OR '1'='1/cancel",
        `/quests/${randomUUID()}/participants/nu-e-uuid/validate`,
      ]) {
        const res = await members[0].post(path);
        expect(res.status).toBe(404);
        expectCleanError(res.body);
      }
      await members[0].delete('/teams/me/members/nu-e-uuid').expect(404);
    });
  });

  describe('exploatarea regulilor jocului', () => {
    async function completeAfter(client: Awaited<ReturnType<typeof signUp>>, minutes: number) {
      const { body } = await client.post('/tasks', newTask({ deadlineAt: inHours(24) })).expect(201);
      ctx.clock.advance(minutes * MINUTE);
      return client.post(`/tasks/${body.id}/complete`).expect(200);
    }

    it('ciclul Completă → Undo → Completă nu acordă recompensa de mai multe ori', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ deadlineAt: inHours(24) })).expect(201);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      const xpOnce = (await ana.get('/me').expect(200)).body.xpTotal;
      expect(xpOnce).toBeGreaterThan(0);

      await ana.post(`/tasks/${task.id}/undo`).expect(200);
      await ana.post(`/tasks/${task.id}/complete`).expect(200);
      await ana.post(`/tasks/${task.id}/undo`).expect(409);
      await ana.post(`/tasks/${task.id}/complete`).expect(409);
      expect((await ana.get('/me').expect(200)).body.xpTotal).toBe(xpOnce);
    });

    it('ștergerea unei activități finalizate nu retrage și nu dublează recompensa', async () => {
      const ana = await signUp(ctx.server);
      const res = await completeAfter(ana, 10);
      const before = (await ana.get('/me').expect(200)).body;
      await ana.delete(`/tasks/${res.body.task?.id ?? res.body.id}`).expect(204);
      const after = (await ana.get('/me').expect(200)).body;
      expect(after.xpTotal).toBe(before.xpTotal);
      expect(after.coins).toBe(before.coins);
    });

    it('zeci de activități ușoare create și finalizate rapid nu trec de plafonul zilnic de XP', async () => {
      const ana = await signUp(ctx.server);
      for (let i = 0; i < 30; i += 1) await completeAfter(ana, 2);
      const me = (await ana.get('/me').expect(200)).body;
      expect(me.xpTotal).toBeLessThanOrEqual(150);
      await ana.post('/tasks', newTask()).expect(429);
    });

    it('cereri simultane de Completă și Undo nu lasă recompense în plus', async () => {
      const ana = await signUp(ctx.server);
      const { body: task } = await ana.post('/tasks', newTask({ deadlineAt: inHours(24) })).expect(201);
      ctx.clock.advance(10 * MINUTE);
      await Promise.all(Array.from({ length: 5 }, () => ana.post(`/tasks/${task.id}/complete`)));
      await Promise.all(Array.from({ length: 5 }, () => ana.post(`/tasks/${task.id}/undo`)));
      await Promise.all(Array.from({ length: 5 }, () => ana.post(`/tasks/${task.id}/complete`)));

      const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: ana.id } });
      const xp = await ctx.prisma.rewardLedger.aggregate({ where: { userId: ana.id, kind: 'XP' }, _sum: { delta: true } });
      expect(user.xpTotal).toBe(xp._sum.delta ?? 0);
      const completions = await ctx.prisma.rewardLedger.count({ where: { userId: ana.id, kind: 'XP', delta: { gt: 0 } } });
      expect(completions).toBeLessThanOrEqual(2);
    });

    it('doi colegi care își validează reciproc multe quest-uri nu trec de plafoanele zilnice', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const quests = [];
      for (let i = 0; i < 6; i += 1) {
        quests.push((await ana.post('/quests', { title: `Q${i}`, deadlineAt: inHours(6), difficulty: 'EASY' }).expect(201)).body);
      }
      ctx.clock.advance(10 * MINUTE);
      for (const q of quests) {
        await ana.post(`/quests/${q.id}/done`).expect(200);
        await bob.post(`/quests/${q.id}/done`).expect(200);
        await bob.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(200);
        await ana.post(`/quests/${q.id}/participants/${bob.id}/validate`).expect(200);
      }

      for (const p of [ana, bob]) {
        const ledger = await ctx.prisma.rewardLedger.findMany({ where: { userId: p.id, kind: 'XP' } });
        expect(ledger.filter((e) => e.reason === 'VALIDATOR_REWARD' && e.delta > 0)).toHaveLength(3);
        expect(ledger.filter((e) => e.reason === 'GROUP_BONUS' && e.delta > 0).length).toBeLessThanOrEqual(3);
        expect((await p.get('/me').expect(200)).body.xpTotal).toBeLessThanOrEqual(150);
      }
      expect((await ana.get('/teams/me').expect(200)).body.team.groupBonusesToday).toBe(3);
    });
  });

  describe('limitarea cererilor', () => {
    let limited: TestContext;

    beforeAll(async () => {
      limited = await createTestApp();
    });

    afterAll(async () => {
      await limited.app.close();
    });

    it('după 10 încercări de autentificare pe minut răspunde 429, apoi revine', async () => {
      const attempt = () =>
        request(limited.server).post(`${API}/auth/login`).send({ email: 'tinta@example.com', password: 'ghicire-parola' });
      for (let i = 0; i < 10; i += 1) expect((await attempt()).status).toBe(401);
      const blocked = await attempt();
      expect(blocked.status).toBe(429);
      expect(blocked.body.code).toBe('TOO_MANY_REQUESTS');
    });

    it('cererile de resetare a parolei sunt limitate la 5 pe minut', async () => {
      const ask = () => request(limited.server).post(`${API}/auth/forgot-password`).send({ email: 'tinta@example.com' });
      for (let i = 0; i < 5; i += 1) expect((await ask()).status).toBe(204);
      expect((await ask()).status).toBe(429);
    });
  });

  describe('timp real', () => {
    let url: string;
    const sockets: Socket[] = [];

    beforeAll(async () => {
      await ctx.app.listen(0);
      const { port } = ctx.app.getHttpServer().address() as AddressInfo;
      url = `http://127.0.0.1:${port}`;
    });

    afterEach(() => {
      while (sockets.length) sockets.pop()?.disconnect();
    });

    const connect = (token?: unknown) => {
      const socket = io(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false });
      sockets.push(socket);
      return socket;
    };

    const disconnected = (socket: Socket) =>
      new Promise<boolean>((resolve) => {
        socket.on('disconnect', () => resolve(true));
        setTimeout(() => resolve(false), 3000);
      });

    async function tokenOf(client: { id: string }) {
      return new JwtService().sign({ sub: client.id }, { secret: secret() });
    }

    async function inRoom(room: string, count: number) {
      const gateway = ctx.app.get(RealtimeGateway);
      for (let i = 0; i < 50; i += 1) {
        if ((await gateway.server!.in(room).fetchSockets()).length >= count) return;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`camera ${room} nu are ${count} conexiuni`);
    }

    it('închide conexiunile fără token sau cu token invalid', async () => {
      const expired = new JwtService().sign(
        { sub: randomUUID(), exp: Math.floor(Date.now() / 1000) - 60 },
        { secret: secret() },
      );
      for (const token of [undefined, 'token-fals', 42, expired]) {
        expect(await disconnected(connect(token))).toBe(true);
      }
    });

    it('evenimentele unei echipe ajung doar la membrii ei', async () => {
      const a = await team(2);
      const b = await team(2);
      const insider = connect(await tokenOf(a.members[1]));
      const outsider = connect(await tokenOf(b.members[0]));
      await inRoom(`team:${a.id}`, 1);
      await inRoom(`team:${b.id}`, 1);

      const seenByInsider: unknown[] = [];
      const seenByOutsider: unknown[] = [];
      insider.on('quest.updated', (e) => seenByInsider.push(e));
      outsider.onAny((_event, e) => seenByOutsider.push(e));

      await a.members[0].post('/quests', { title: 'Privat', deadlineAt: inHours(4), difficulty: 'EASY' }).expect(201);
      for (let i = 0; i < 40 && seenByInsider.length === 0; i += 1) await new Promise((r) => setTimeout(r, 50));
      await new Promise((r) => setTimeout(r, 200));

      expect(seenByInsider).toHaveLength(1);
      expect(seenByOutsider).toHaveLength(0);
    });

    it('un membru scos din echipă nu mai primește evenimentele ei', async () => {
      const { members, id } = await team(3);
      const kicked = connect(await tokenOf(members[2]));
      await inRoom(`team:${id}`, 1);
      const seen: string[] = [];
      kicked.onAny((event) => seen.push(event));

      await members[0].delete(`/teams/me/members/${members[2].id}`).expect(200);
      await new Promise((r) => setTimeout(r, 200));
      seen.length = 0;

      await members[0].post('/quests', { title: 'După', deadlineAt: inHours(4), difficulty: 'EASY' }).expect(201);
      await new Promise((r) => setTimeout(r, 300));
      expect(seen).toEqual([]);
    });
  });
});
