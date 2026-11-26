import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** Build-ul aplicației web (apps/web/dist), relativ la apps/api/dist/main.js. */
export const DEFAULT_WEB_DIST = resolve(__dirname, '../../web/dist');

/**
 * În producție, API-ul servește și aplicația web, de pe aceeași adresă. Așa cookie-ul de
 * refresh (SameSite=Lax) și conexiunea în timp real funcționează fără CORS între domenii
 * diferite. Orice cerere GET care nu e pentru API sau socket.io primește index.html, ca
 * rutele aplicației (de ex. /team, /reset-password) să meargă și la reîncărcarea paginii.
 * Întoarce false dacă build-ul web lipsește (de exemplu, în dezvoltare).
 */
export function serveWebApp(app: NestExpressApplication, dir = DEFAULT_WEB_DIST): boolean {
  const index = join(dir, 'index.html');
  if (!existsSync(index)) return false;

  // Fișierele din assets/ au hash în nume, deci se pot păstra în cache un an.
  app.useStaticAssets(join(dir, 'assets'), { prefix: '/assets', immutable: true, maxAge: '1y' });
  app.useStaticAssets(dir, { index: false, maxAge: '1h' });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPage = req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/socket.io');
    if (!isPage || !req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return true;
}
