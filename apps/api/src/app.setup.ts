import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ENV, type Env } from './config/env';

/** Configurarea comună pentru server și pentru teste. */
export function configureApp(app: NestExpressApplication): void {
  const env = app.get<Env>(ENV);
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
}
