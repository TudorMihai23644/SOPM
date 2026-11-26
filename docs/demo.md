# Demo final (săptămâna 8)

Durata țintă: **10 minute** de demo, apoi întrebări. Fiecare membru prezintă partea lui din Charter.

## Pregătire

**Cu 1–2 zile înainte** (unele reguli depind de timp, deci nu se pot arăta din conturi noi):

- [ ] Cont `ana` cu câteva activități completate la timp în zile diferite, ca să aibă nivel, monede și o serie COMBO.
- [ ] Cont `bogdan`, în aceeași echipă cu `ana` (codul de invitație).
- [ ] O activitate a lui `ana` cu termenul în timpul demo-ului, ca să devină restantă live (sau una deja restantă).
- [ ] Activități create cu cel puțin un minut înainte de demo, ca să poată fi completate pentru XP (sub 60 de secunde de la creare nu dau nimic).
- [ ] Un Shared Quest deschis, la care `bogdan` a apăsat deja „Terminat”.

**În ziua demo-ului:**

- [ ] Deschideți aplicația publicată cu 5 minute înainte (serviciul gratuit adoarme).
- [ ] Două ferestre de browser alăturate (una normală, una privată): `ana` și `bogdan`. Opțional, telefonul cu Expo Go.
- [ ] Rezervă: aplicația pornită local (`npm run dev:api` și `npm run dev:web`), pentru cazul în care rețeaua nu merge.

## Scenariu

| Minut | Cine | Ce arătăm |
| --- | --- | --- |
| 0–1 | Membrul 2 | Problema și ideea: sarcini personale ca un joc. Arhitectura într-un slide (web, mobil, API, PostgreSQL) și CI-ul pe GitHub. |
| 1–2 | Membrul 4 | Înregistrarea unui cont nou și ecranul principal: XP, HP, monede, scena 3D. |
| 2–4 | Membrul 1 | Ca `ana`: creăm o activitate, o edităm, o amânăm. Completăm una pregătită, apoi Undo în 10 secunde și completăm din nou. Pagina Istoric. |
| 4–5 | Membrul 2 | Regulile jocului: XP cu COMBO, plafonul Stamina, o activitate restantă care scade HP. Explicăm de ce o finalizare imediată nu dă XP (anti-farming). |
| 5–7 | Membrul 3 | Echipa: codul de invitație. `bogdan` validează quest-ul lui `ana`, iar fereastra lui `ana` se actualizează în timp real. Bonusul de grup și seiful echipei. |
| 7–8 | Membrul 4 | Tema deschisă/întunecată. Aceeași activitate pe telefon (glisare pentru Completă). |
| 8–9 | Membrul 1 | Profil: exportul datelor și ștergerea contului (pe contul nou creat la minutul 1). |
| 9–10 | Membrul 2 | Securitate și calitate: testele automate (aproximativ 170) și ce au găsit, publicarea pe Render. Rezultatele playtestului și ce am schimbat după el. |

## Întrebări probabile

- **De ce nu pot trișa marcând totul ca terminat?** Sub 60 de secunde de la creare nu se primește nimic, Stamina limitează XP-ul la 150 pe zi, iar Undo merge o singură dată. Testele de abuz verifică toate acestea.
- **Ce se întâmplă dacă serverul e oprit noaptea?** Job-urile recuperează la pornire: restanțele se evaluează și la citire, iar zilele curate se recompensează retroactiv, până la 7 zile.
- **Cum se validează un quest dacă nimeni nu răspunde?** Automat după 48 de ore, dar fără bonus de grup.
- **Unde sunt parolele?** Doar hash-uri Argon2. Tokenul de acces stă în memorie, iar refresh token-ul într-un cookie HttpOnly.
