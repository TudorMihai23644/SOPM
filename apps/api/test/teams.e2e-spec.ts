import { QuestsService } from '../src/teams/quests.service';
import { createTestApp, HOUR, MINUTE, signUp, type TestContext } from './helpers';

describe('Echipe și Shared Quests (e2e)', () => {
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

  async function player() {
    const client = await signUp(ctx.server);
    const me = async () => (await client.get('/me').expect(200)).body;
    return { ...client, me };
  }

  /** O echipă cu `size` membri; primul este liderul. */
  async function team(size = 2) {
    const members = [];
    for (let i = 0; i < size; i += 1) members.push(await player());
    const created = await members[0].post('/teams', { name: 'Ghilda Nopții' }).expect(201);
    for (const m of members.slice(1)) await m.post('/teams/join', { code: created.body.inviteCode }).expect(200);
    return { members, code: created.body.inviteCode as string, id: created.body.id as string };
  }

  async function expectLedgerMatches(userId: string) {
    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const sums = await ctx.prisma.rewardLedger.groupBy({ by: ['kind'], where: { userId }, _sum: { delta: true } });
    const sum = (kind: string) => sums.find((s) => s.kind === kind)?._sum.delta ?? 0;
    expect(user.xpTotal).toBe(sum('XP'));
    expect(user.coins).toBe(sum('COINS'));
    expect(user.hp).toBe(100 + sum('HP'));
  }

  describe('echipa', () => {
    it('se creează cu un cod de 6 caractere, iar creatorul devine lider', async () => {
      const ana = await player();
      const res = await ana.post('/teams', { name: 'Ghilda' }).expect(201);
      expect(res.body.inviteCode).toMatch(/^[A-Z2-9]{6}$/);
      expect(res.body).toMatchObject({ level: 1, vaultCoins: 0, leaderId: ana.id });
      expect(res.body.members).toEqual([expect.objectContaining({ userId: ana.id, role: 'LEADER' })]);
      expect((await ana.me()).teamId).toBe(res.body.id);
    });

    it('acceptă cel mult 4 membri, iar un utilizator stă într-o singură echipă', async () => {
      const { members, code } = await team(4);
      const fifth = await player();
      const full = await fifth.post('/teams/join', { code }).expect(409);
      expect(full.body.code).toBe('TEAM_FULL');
      expect((await members[1].post('/teams', { name: 'Alta' }).expect(409)).body.code).toBe('ALREADY_IN_TEAM');
      expect((await fifth.post('/teams/join', { code: 'ZZZZZZ' }).expect(404)).body.code).toBe('INVALID_INVITE_CODE');
    });

    it('la intrări simultane nu se depășesc 4 membri', async () => {
      const { code } = await team(2);
      const others = await Promise.all([1, 2, 3].map(() => player()));
      const results = await Promise.all(others.map((p) => p.post('/teams/join', { code })));
      expect(results.filter((r) => r.status === 200)).toHaveLength(2);
      expect(await ctx.prisma.teamMember.count()).toBe(4);
    });

    it('dacă pleacă liderul, conducerea trece la cel mai vechi membru; echipa goală se șterge', async () => {
      const { members, id } = await team(3);
      await members[0].post('/teams/me/leave').expect(204);
      const res = await members[1].get('/teams/me').expect(200);
      expect(res.body.team.leaderId).toBe(members[1].id);
      await members[1].post('/teams/me/leave').expect(204);
      await members[2].post('/teams/me/leave').expect(204);
      expect(await ctx.prisma.team.findUnique({ where: { id } })).toBeNull();
      expect((await members[0].get('/teams/me').expect(200)).body).toEqual({ team: null });
    });

    it('doar liderul poate scoate membri și regenera codul', async () => {
      const { members, code } = await team(3);
      expect((await members[1].delete(`/teams/me/members/${members[2].id}`).expect(403)).body.code).toBe('LEADER_ONLY');
      await members[0].delete(`/teams/me/members/${members[2].id}`).expect(200);
      expect((await members[2].get('/teams/me').expect(200)).body.team).toBeNull();
      const regenerated = await members[0].post('/teams/me/regenerate-code').expect(200);
      expect(regenerated.body.inviteCode).not.toBe(code);
      await members[1].post('/teams/me/regenerate-code').expect(403);
    });
  });

  describe('Shared Quests', () => {
    async function quest(creator: Awaited<ReturnType<typeof player>>, difficulty = 'MEDIUM', hours = 4, extra = {}) {
      return (
        await creator.post('/quests', { title: 'Proiect de grup', deadlineAt: inHours(hours), difficulty, ...extra }).expect(201)
      ).body;
    }

    it('cer o echipă de cel puțin 2 membri', async () => {
      const ana = await player();
      await ana.post('/teams', { name: 'Solo' }).expect(201);
      const res = await ana.post('/quests', { title: 'X', deadlineAt: inHours(2), difficulty: 'EASY' }).expect(409);
      expect(res.body.code).toBe('TEAM_TOO_SMALL');
    });

    it('fluxul complet: terminat → validat de coleg → bonus de grup, seif și XP de echipă', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const q = await quest(ana);
      expect(q.participants.map((p: { status: string }) => p.status)).toEqual(['PENDING', 'PENDING']);

      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/quests/${q.id}/done`).expect(200);
      await bob.post(`/quests/${q.id}/done`).expect(200);

      const afterFirst = await bob.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(200);
      expect(afterFirst.body.status).toBe('OPEN');
      const done = await ana.post(`/quests/${q.id}/participants/${bob.id}/validate`).expect(200);
      expect(done.body.status).toBe('COMPLETED');
      expect(done.body.bonusGrantedAt).not.toBeNull();

      // Personal: 25 × 1,05 (COMBO ziua 1) = 26; validator +5; bonus de grup 50% din 25 = 12.
      for (const p of [ana, bob]) {
        const me = await p.me();
        expect(me.xpTotal).toBe(26 + 5 + 12);
        expect(me.coins).toBe(10);
        await expectLedgerMatches(p.id);
      }
      const teamRes = await ana.get('/teams/me').expect(200);
      expect(teamRes.body.team).toMatchObject({ vaultCoins: 10, teamXp: 25, groupBonusesToday: 1 });
    });

    it('nimeni nu își validează propria completare, iar validările simultane dau recompensa o singură dată', async () => {
      const { members } = await team(3);
      const [ana, bob, cris] = members;
      const q = await quest(ana);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/quests/${q.id}/done`).expect(200);

      expect((await ana.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(403)).body.code).toBe('SELF_VALIDATION');
      const results = await Promise.all([
        bob.post(`/quests/${q.id}/participants/${ana.id}/validate`),
        cris.post(`/quests/${q.id}/participants/${ana.id}/validate`),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect((await ana.me()).xpTotal).toBe(26);
      await expectLedgerMatches(ana.id);
    });

    it('respingerea cere un motiv și readuce participantul la „În lucru”', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const q = await quest(ana);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/quests/${q.id}/done`).expect(200);

      await bob.post(`/quests/${q.id}/participants/${ana.id}/reject`, { reason: '' }).expect(400);
      const res = await bob.post(`/quests/${q.id}/participants/${ana.id}/reject`, { reason: 'Lipsește raportul' }).expect(200);
      const participant = res.body.participants.find((p: { userId: string }) => p.userId === ana.id);
      expect(participant).toMatchObject({ status: 'PENDING', rejectReason: 'Lipsește raportul' });
      expect((await ana.me()).xpTotal).toBe(0);
    });

    it('după 48 h fără validare, completarea se validează automat, fără bonus de grup', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const q = await quest(ana, 'MEDIUM', 100);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/quests/${q.id}/done`).expect(200);
      await bob.post(`/quests/${q.id}/done`).expect(200);

      ctx.clock.advance(49 * HOUR);
      const service = ctx.app.get(QuestsService);
      expect(await service.autoValidate()).toBe(2);
      expect(await service.autoValidate()).toBe(0);

      const list = await ana.get('/quests').expect(200);
      expect(list.body[0]).toMatchObject({ status: 'COMPLETED', bonusGrantedAt: null });
      expect(list.body[0].participants.every((p: { autoValidated: boolean }) => p.autoValidated)).toBe(true);
      expect((await ana.me()).xpTotal).toBe(26);
    });

    it('la termen, participanții încă în lucru devin restanți și pierd HP o singură dată', async () => {
      const { members } = await team(2);
      const [ana, bob] = members;
      const q = await quest(ana, 'HARD', 1);
      ctx.clock.advance(10 * MINUTE);
      await ana.post(`/quests/${q.id}/done`).expect(200);

      ctx.clock.advance(2 * HOUR);
      const service = ctx.app.get(QuestsService);
      expect(await service.markOverdue()).toBe(1);
      expect(await service.markOverdue()).toBe(0);
      await bob.get('/quests').expect(200);

      expect((await bob.me()).hp).toBe(85);
      expect((await ana.me()).hp).toBe(100);
      await expectLedgerMatches(bob.id);

      // Poate termina târziu: 25% din XP, fără bonus de grup.
      await bob.post(`/quests/${q.id}/done`).expect(200);
      await bob.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(200);
      const done = await ana.post(`/quests/${q.id}/participants/${bob.id}/validate`).expect(200);
      expect(done.body).toMatchObject({ status: 'COMPLETED', bonusGrantedAt: null });
      expect((await bob.me()).xpTotal).toBe(12 + 5);
    });

    it('quest-urile sunt vizibile doar membrilor echipei', async () => {
      const { members } = await team(2);
      const q = await quest(members[0]);
      const other = await team(2);

      expect(await other.members[0].get('/quests').expect(200).then((r) => r.body)).toEqual([]);
      await other.members[0].post(`/quests/${q.id}/done`).expect(404);
      await other.members[0].post(`/quests/${q.id}/participants/${members[0].id}/validate`).expect(404);
      const loner = await player();
      expect((await loner.get('/quests').expect(404)).body.code).toBe('NO_TEAM');
    });

    it('liderul poate scuti un participant; plecarea din echipă scutește automat', async () => {
      const { members } = await team(3);
      const [ana, bob, cris] = members;
      const q = await quest(ana);
      ctx.clock.advance(10 * MINUTE);
      await bob.post(`/quests/${q.id}/participants/${cris.id}/excuse`).expect(403);
      await ana.post(`/quests/${q.id}/participants/${cris.id}/excuse`).expect(200);

      await ana.post(`/quests/${q.id}/done`).expect(200);
      await bob.post(`/quests/${q.id}/participants/${ana.id}/validate`).expect(200);
      await bob.post('/teams/me/leave').expect(204);

      const list = await ana.get('/quests').expect(200);
      expect(list.body[0].status).toBe('COMPLETED');
      // Un singur participant rămas: nu există bonus de grup.
      expect(list.body[0].bonusGrantedAt).toBeNull();
    });

    it('creatorul sau liderul poate anula un quest deschis', async () => {
      const { members } = await team(3);
      const q = await quest(members[1]);
      await members[2].post(`/quests/${q.id}/cancel`).expect(403);
      const res = await members[0].post(`/quests/${q.id}/cancel`).expect(200);
      expect(res.body.status).toBe('CANCELLED');
      await members[1].post(`/quests/${q.id}/done`).expect(409);
    });
  });
});
