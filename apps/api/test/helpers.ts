import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { CLOCK, type Clock } from '../src/common/clock';
import { PrismaService } from '../src/prisma/prisma.service';

export const API = '/api/v1';

/** Ceas simulat: testele mută timpul înainte fără să aștepte. */
export class FakeClock implements Clock {
  private current: number;

  constructor(start = '2026-12-15T10:00:00.000Z') {
    this.current = new Date(start).getTime();
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current += ms;
  }

  set(iso: string): void {
    this.current = new Date(iso).getTime();
  }
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

export interface TestContext {
  app: NestExpressApplication;
  server: App;
  prisma: PrismaService;
  clock: FakeClock;
}

export async function createTestApp(clock = new FakeClock()): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return { app, server: app.getHttpServer(), prisma: app.get(PrismaService), clock };
}

let counter = 0;

/** Creează un utilizator nou și întoarce un client cu tokenul lui. */
export async function signUp(server: App, nickname = `user${++counter}`) {
  const res = await request(server)
    .post(`${API}/auth/register`)
    .send({ email: `${nickname}@example.com`, password: 'parola-lunga-1', nickname })
    .expect(201);
  const token: string = res.body.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  return {
    id: res.body.user.id as string,
    get: (path: string) => request(server).get(`${API}${path}`).set(auth),
    post: (path: string, body?: object) => request(server).post(`${API}${path}`).set(auth).send(body),
    patch: (path: string, body: object) => request(server).patch(`${API}${path}`).set(auth).send(body),
    delete: (path: string) => request(server).delete(`${API}${path}`).set(auth),
  };
}
