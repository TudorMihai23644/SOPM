# Arhitectură

```
 Browser (React)        Telefon (Expo)
        │  HTTPS + WebSocket   │
        └──────────┬───────────┘
                   ▼
   NestJS: /api/v1 (REST), /socket.io (timp real),
           restul rutelor = aplicația web (în producție)
                   │  Prisma
                   ▼
              PostgreSQL 16
```

Un monorepo npm cu patru pachete:

| Pachet | Tehnologii | Rol |
| --- | --- | --- |
| `packages/shared` | TypeScript, Zod | Tipurile, schemele de validare și **regulile jocului** (XP, niveluri, HP, Stamina, bonusuri), folosite identic de server, web și mobil. |
| `apps/api` | NestJS 11, Prisma 6, PostgreSQL, socket.io | API-ul REST, job-urile periodice și canalul de timp real. |
| `apps/web` | React 19, Vite, Tailwind, TanStack Query, React Three Fiber | Aplicația web, cu scena 3D din panoul eroului. |
| `apps/mobile` | Expo, React Native, Expo Router | Aplicația pentru Android și iOS. |

## Module ale API-ului

| Modul | Conține |
| --- | --- |
| `auth` | Înregistrare, login, refresh cu rotație, logout, schimbarea și resetarea parolei, gardianul JWT. |
| `users` | `GET/PATCH /me`, exportul datelor, ștergerea contului, job-ul `daily-rollover`. |
| `tasks` | Activitățile, tranzițiile de stare, Undo, Istoricul, job-ul `overdue-scan`. |
| `game` | Acordarea și retragerea recompenselor, Stamina, HP și KO, prin registrul de recompense. |
| `teams` | Echipe, Shared Quests, validare, bonus de grup, job-urile `quest-overdue-scan` și `review-timeout`, gateway-ul socket.io. |

## Date

| Tabelă | Ce ține |
| --- | --- |
| `users` | Contul și starea jocului: XP total, nivel, HP, monede, serie. |
| `tasks` | Activitățile: termen, dificultate, stare, numărul de amânări, Undo. |
| `history_log` | Fiecare schimbare de stare, cu titlul păstrat și după ștergere. |
| `reward_ledger` | Fiecare câștig sau pierdere de XP, monede și HP. Totalurile din `users` sunt mereu suma registrului; Undo adaugă intrări inverse, nu șterge. |
| `daily_stamina` | XP-ul primit în fiecare zi de joc, pentru plafonul de 150. |
| `refresh_tokens`, `password_reset_tokens` | Doar hash-uri SHA-256 ale tokenurilor. |
| `teams`, `team_members` | Echipe, roluri (lider/membru), codul de invitație, XP de echipă, seiful. |
| `quests`, `quest_participants` | Quest-urile și starea fiecărui participant (În lucru, Așteaptă validare, Validat, Restant, Scutit). |
| `app_config` | Copie a valorilor jocului, scrisă de `npm run db:seed` (serverul nu o citește încă). |

Toate schimbările care afectează recompensele rulează în tranzacții cu rândurile blocate (`SELECT ... FOR UPDATE`). Cheile unice din registru împiedică acordarea aceleiași recompense de două ori, chiar la cereri simultane.

## Timpul

- Serverul folosește un ceas injectat (`CLOCK`). În teste ceasul e simulat, deci regulile de timp (Undo în 10 secunde, 48 de ore, ziua de joc) se testează fără așteptare.
- **Ziua de joc** începe la 04:00 în fusul orar al utilizatorului. Stamina, seria COMBO și ziua curată se calculează pe ea.

## Job-uri periodice

| Job | Interval | Ce face |
| --- | --- | --- |
| `overdue-scan` | 1 minut | Activitățile cu termenul trecut devin Restant și scad HP (și la fiecare citire a listei). |
| `quest-overdue-scan` | 1 minut | La fel, pentru participanții la quest-uri. |
| `review-timeout` | 15 minute | Validează automat completările care așteaptă de peste 48 de ore. |
| `daily-rollover` | 15 minute | După ora 04:00 locală: +10 HP pentru o zi curată. Recuperează până la 7 zile ratate. |

## Timp real

Clientul se conectează la `/socket.io` cu tokenul de acces. Serverul îl pune în camera `user:{id}` și, dacă are echipă, în `team:{id}`. Evenimentele (`quest.updated`, `quest.review_requested`, `team.updated`, `team.member_joined`, `team.member_left`, `team.level_up`) spun doar ce s-a schimbat; clientul își reîncarcă datele prin API.

## Calitate

- **Teste**: aproximativ 170 (unitare pentru regulile din `shared`, e2e pentru API pe o bază de date reală), inclusiv suita de securitate. Vezi [securitate.md](securitate.md).
- **CI** (GitHub Actions), la fiecare push pe `main` și la fiecare pull request: lint, verificarea tipurilor, teste, build și `npm audit`.
- **Publicare**: imagine Docker pe Render. Vezi [deploy.md](deploy.md).
