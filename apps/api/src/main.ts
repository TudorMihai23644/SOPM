import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ENV, type Env } from './config/env';
import { serveWebApp } from './web-app';

// Variabilele din apps/api/.env, dacă fișierul există (în producție vin din mediu).
try {
  process.loadEnvFile();
} catch {
  // fără fișier .env
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  const env = app.get<Env>(ENV);
  if (serveWebApp(app, env.WEB_DIST)) Logger.log('Aplicația web este servită de API', 'web');
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
