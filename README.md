# DeadlineHero

Aplicație web care transformă sarcinile personale într-un joc: finalizezi activitățile la timp și primești XP și monede, întârzii și pierzi HP. Documentele proiectului (Project Charter și Specificațiile de proiectare) sunt în rădăcina repository-ului.

## Structura

| Folder | Conținut |
| --- | --- |
| `apps/api` | API REST (NestJS, Prisma, PostgreSQL), sub `/api/v1` |
| `apps/web` | Interfața web (React, Vite, Tailwind, TanStack Query) |
| `packages/shared` | Tipuri, validări și regulile jocului, folosite de API și de web |

## Pornire locală

Cerințe: Node.js 20 sau mai nou și Docker (sau un PostgreSQL 16 local).

```bash
npm install
docker compose up -d db
cp .env.example apps/api/.env      # pe Windows (cmd): copy .env.example apps\api\.env
npm run build -w @deadlinehero/shared
npm run db:migrate
npm run db:seed
```

Apoi, în două terminale:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Aplicația web rulează pe http://localhost:5173 și trimite cererile `/api` către API, pe portul 3000.

## Verificări

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Testele API-ului folosesc o bază de date separată, dată de `TEST_DATABASE_URL` (implicit `deadlinehero_test`), cu migrările aplicate:

```bash
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/deadlinehero_test npx prisma migrate deploy
```

CI-ul (GitHub Actions) rulează lint, verificarea tipurilor, testele, build-ul și `npm audit` la fiecare push pe `main` și la fiecare pull request.

## API disponibil

| Rută | Ce face |
| --- | --- |
| `POST /api/v1/auth/register` | Creează un cont și pornește sesiunea |
| `POST /api/v1/auth/login` | Autentificare (maximum 10 încercări pe minut) |
| `POST /api/v1/auth/refresh` | Reînnoiește tokenul de acces din cookie-ul de refresh |
| `POST /api/v1/auth/logout` | Închide sesiunea |
| `GET /api/v1/me` | Profilul și starea jocului (nivel, XP, HP, monede) |
| `GET /api/v1/health` | Verificare pentru hosting |

Tokenul de acces (JWT, 15 minute) stă doar în memoria aplicației web. Refresh token-ul e într-un cookie HttpOnly, se rotește la fiecare folosire și se păstrează în baza de date doar ca hash.
