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

Testele API-ului rulează pe o bază de date separată, `deadlinehero_test` (sau cea din `TEST_DATABASE_URL`). `npm test` o creează și îi aplică migrările automat, deci e nevoie doar ca PostgreSQL să fie pornit (`docker compose up -d db`).

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
| `GET /api/v1/tasks` | Lista activităților (filtru `status`, `sort=deadline|recent`, paginare cu `cursor`) |
| `POST /api/v1/tasks` | Creează o activitate (maximum 30 pe zi de joc și 100 active) |
| `GET /api/v1/tasks/{id}` | O activitate |
| `PATCH /api/v1/tasks/{id}` | Editează titlul și descrierea sau mută termenul (maximum 2 amânări) |
| `POST /api/v1/tasks/{id}/complete` | Marchează activitatea Completă |
| `POST /api/v1/tasks/{id}/cancel` | Anulează activitatea |
| `POST /api/v1/tasks/{id}/undo` | Anulează finalizarea, în cel mult 10 secunde, o singură dată |
| `DELETE /api/v1/tasks/{id}` | Șterge definitiv activitatea; titlul rămâne în istoric |
| `GET /api/v1/history` | Istoricul schimbărilor de stare |

Activitățile al căror termen a trecut devin Restant prin job-ul `overdue-scan`, care rulează la fiecare minut, și la fiecare citire a listei.

Tokenul de acces (JWT, 15 minute) stă doar în memoria aplicației web. Refresh token-ul e într-un cookie HttpOnly, se rotește la fiecare folosire și se păstrează în baza de date doar ca hash.
