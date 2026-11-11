import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const API = '/api/v1';
const ana = { email: 'ana@example.com', password: 'parola-lunga-1', nickname: 'ana' };

function refreshCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = cookies.find((c) => c.startsWith('dh_refresh='));
  if (!cookie) throw new Error('lipsește cookie-ul de refresh');
  return cookie.split(';')[0];
}

describe('Autentificare (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (body: Record<string, unknown> = ana) => request(server).post(`${API}/auth/register`).send(body);

  it('creează un cont nou cu valorile de start ale jocului', async () => {
    const res = await register().expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: ana.email, nickname: 'ana', level: 1, hp: 100, coins: 0, xpTotal: 0 });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie = ([] as string[]).concat(res.headers['set-cookie']).join(';');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: ana.email } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('refuză emailul sau porecla deja folosite', async () => {
    await register().expect(201);
    const sameEmail = await register({ ...ana, nickname: 'alta', email: 'ANA@example.com' }).expect(409);
    expect(sameEmail.body.code).toBe('EMAIL_TAKEN');
    const sameNickname = await register({ ...ana, email: 'alta@example.com' }).expect(409);
    expect(sameNickname.body.code).toBe('NICKNAME_TAKEN');
  });

  it('întoarce erori de validare cu câmpul afectat', async () => {
    const res = await register({ ...ana, password: 'scurta' }).expect(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(res.body.details[0].path).toBe('password');
  });

  it('autentifică doar cu parola corectă', async () => {
    await register().expect(201);
    const wrong = await request(server)
      .post(`${API}/auth/login`)
      .send({ email: ana.email, password: 'parola-gresita' })
      .expect(401);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');

    const unknown = await request(server)
      .post(`${API}/auth/login`)
      .send({ email: 'nimeni@example.com', password: ana.password })
      .expect(401);
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');

    const ok = await request(server).post(`${API}/auth/login`).send({ email: ana.email, password: ana.password }).expect(200);
    expect(ok.body.user.nickname).toBe('ana');
  });

  it('GET /me cere un token valid', async () => {
    await request(server).get(`${API}/me`).expect(401);
    await request(server).get(`${API}/me`).set('Authorization', 'Bearer token-fals').expect(401);

    const { body } = await register().expect(201);
    const me = await request(server).get(`${API}/me`).set('Authorization', `Bearer ${body.accessToken}`).expect(200);
    expect(me.body).toMatchObject({ nickname: 'ana', level: 1, xpInLevel: 0, xpToNextLevel: 100, hpMax: 100 });
  });

  it('rotește refresh token-ul și revocă toate sesiunile la refolosirea unuia vechi', async () => {
    const first = refreshCookie(await register().expect(201));

    const rotated = await request(server).post(`${API}/auth/refresh`).set('Cookie', first).expect(200);
    const second = refreshCookie(rotated);
    expect(second).not.toBe(first);
    expect(rotated.body.accessToken).toEqual(expect.any(String));

    // Tokenul vechi folosit din nou: probabil furat, deci se închid toate sesiunile.
    const reuse = await request(server).post(`${API}/auth/refresh`).set('Cookie', first).expect(401);
    expect(reuse.body.code).toBe('INVALID_SESSION');
    await request(server).post(`${API}/auth/refresh`).set('Cookie', second).expect(401);
  });

  it('refuză refresh fără cookie', async () => {
    const res = await request(server).post(`${API}/auth/refresh`).expect(401);
    expect(res.body.code).toBe('INVALID_SESSION');
  });

  it('deconectarea invalidează refresh token-ul', async () => {
    const cookie = refreshCookie(await register().expect(201));
    await request(server).post(`${API}/auth/logout`).set('Cookie', cookie).expect(204);
    await request(server).post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
  });

  it('raportează starea serviciului', async () => {
    await request(server).get(`${API}/health`).expect(200, { status: 'ok' });
  });
});
