# DeadlineHero

Aplicație web care transformă sarcinile personale într-un joc: finalizezi activitățile la timp și primești XP și monede, întârzii și pierzi HP. Documentele proiectului (Project Charter și Specificațiile de proiectare) sunt în rădăcina repository-ului.

## Documentație

| Document | Conținut |
| --- | --- |
| [Ghid de utilizare](docs/ghid-utilizare.md) | Cum se folosește aplicația și regulile jocului |
| [Arhitectură](docs/arhitectura.md) | Pachetele, modulele API-ului, datele, job-urile, timpul real |
| [Publicare](docs/deploy.md) | Publicarea pe Render și limitele planului gratuit |
| [Securitate](docs/securitate.md) | Măsurile de securitate, testele de abuz și ce au găsit |
| [Playtest](docs/playtest.md) | Planul, scenariile și formularul de feedback |
| [Demo final](docs/demo.md) | Pregătirea și scenariul de 10 minute |

## Structura

| Folder | Conținut |
| --- | --- |
| `apps/api` | API REST (NestJS, Prisma, PostgreSQL), sub `/api/v1` |
| `apps/web` | Interfața web (React, Vite, Tailwind, TanStack Query) |
| `apps/mobile` | Aplicația mobilă (Expo / React Native, Expo Router) pentru Android și iOS |
| `packages/shared` | Tipuri, validări și regulile jocului, folosite de API, web și mobil |

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

### Aplicația mobilă

Cu API-ul pornit, într-un al treilea terminal:

```bash
npm run dev:mobile
```

Scanează codul QR cu aplicația **Expo Go** (Android) sau cu camera (iOS). Telefonul și calculatorul trebuie să fie în aceeași rețea Wi-Fi: aplicația găsește singură API-ul pe IP-ul calculatorului, portul 3000. Dacă firewall-ul Windows blochează conexiunea, permite Node.js în rețelele private. Pentru un server anume, setează `EXPO_PUBLIC_API_URL` (de ex. `https://api.exemplu.ro/api/v1`).

Pe mobil: swipe la dreapta pe o misiune o marchează Completă (cu vibrație), swipe la stânga arată Anulează și Șterge. Sesiunea se păstrează în Keychain / Keystore.

## Verificări

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Testele API-ului rulează pe o bază de date separată, `deadlinehero_test` (sau cea din `TEST_DATABASE_URL`). `npm test` o creează și îi aplică migrările automat, deci e nevoie doar ca PostgreSQL să fie pornit (`docker compose up -d db`).

CI-ul (GitHub Actions) rulează lint, verificarea tipurilor, testele, build-ul și `npm audit` la fiecare push pe `main` și la fiecare pull request.

## Publicare

Aplicația se publică pe Render ca un singur serviciu Docker (API-ul servește și aplicația web), plus o bază de date PostgreSQL: **New → Blueprint** pe render.com, cu acest repository. Pașii, variabilele și limitele planului gratuit sunt în [docs/deploy.md](docs/deploy.md).

## API disponibil

| Rută | Ce face |
| --- | --- |
| `POST /api/v1/auth/register` | Creează un cont și pornește sesiunea |
| `POST /api/v1/auth/login` | Autentificare (maximum 10 încercări pe minut) |
| `POST /api/v1/auth/refresh` | Reînnoiește tokenul de acces din cookie-ul de refresh |
| `POST /api/v1/auth/logout` | Închide sesiunea |
| `POST /api/v1/auth/change-password` | Schimbă parola și închide celelalte sesiuni |
| `POST /api/v1/auth/forgot-password` | Trimite linkul de resetare (în versiunea 1, în logul serverului) |
| `POST /api/v1/auth/reset-password` | Setează o parolă nouă cu linkul de resetare |
| `GET /api/v1/me` | Profilul și starea jocului (nivel, XP, HP, monede) |
| `PATCH /api/v1/me` | Schimbă porecla sau fusul orar |
| `GET /api/v1/me/export` | Exportă datele contului (JSON) |
| `DELETE /api/v1/me` | Șterge definitiv contul (cere parola) |
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
| `POST /api/v1/teams` | Creează o echipă; creatorul devine lider |
| `POST /api/v1/teams/join` | Intrare în echipă cu codul de invitație |
| `GET /api/v1/teams/me` | Echipa utilizatorului, cu membrii |
| `POST /api/v1/teams/me/leave` | Plecarea din echipă |
| `DELETE /api/v1/teams/me/members/{userId}` | Liderul scoate un membru |
| `POST /api/v1/teams/me/regenerate-code` | Liderul generează un cod de invitație nou |
| `GET /api/v1/quests` | Quest-urile echipei |
| `POST /api/v1/quests` | Creează un Shared Quest (echipă de cel puțin 2 membri) |
| `POST /api/v1/quests/{id}/done` | Participantul marchează quest-ul ca terminat |
| `POST /api/v1/quests/{id}/participants/{userId}/validate` | Un coleg validează completarea |
| `POST /api/v1/quests/{id}/participants/{userId}/reject` | Un coleg respinge completarea, cu motiv |
| `POST /api/v1/quests/{id}/participants/{userId}/excuse` | Liderul scutește un participant |
| `POST /api/v1/quests/{id}/cancel` | Creatorul sau liderul anulează quest-ul |

Activitățile al căror termen a trecut devin Restant prin job-ul `overdue-scan`, care rulează la fiecare minut, și la fiecare citire a listei.

Tokenul de acces (JWT, 15 minute) stă doar în memoria aplicației web. Refresh token-ul e într-un cookie HttpOnly, se rotește la fiecare folosire și se păstrează în baza de date doar ca hash.
