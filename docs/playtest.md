# Playtest (săptămâna 7)

Scopul: 5–10 colegi folosesc aplicația publicată timp de câteva zile, iar noi aflăm ce e neclar, ce nu merge și dacă regulile jocului sunt echilibrate. Rezultatele intră în „Corecturi după playtest” (săptămâna 8).

## Pregătire (cu o zi înainte)

- [ ] Aplicația e publicată (vezi [deploy.md](deploy.md)) și baza de date a fost creată de cel mult 30 de zile.
- [ ] Am deschis aplicația cu câteva minute înainte, ca serviciul gratuit să fie treaz.
- [ ] Lista participanților, cu cel puțin 2 echipe de câte 2–4 persoane.
- [ ] Un membru al echipei urmărește logul Render pentru linkurile de resetare a parolei și pentru erori.
- [ ] Formularul de feedback (întrebările de mai jos) e pregătit, de exemplu în Google Forms.

## Desfășurare

**Ziua 1, sesiune comună (30 de minute):**

1. Fiecare participant își face cont pe web sau pe telefon. Autentificați-vă pe rând: din aceeași rețea Wi-Fi, limita este de 10 autentificări pe minut pentru toți.
2. Fiecare își creează 3–5 activități reale pentru zilele următoare, cu dificultăți diferite.
3. Echipele se formează cu codul de invitație, iar fiecare echipă creează un Shared Quest.

**Zilele 2–4, fiecare în ritmul lui:** completează, amână, lasă intenționat o activitate să devină restantă, validează quest-urile colegilor.

**Ziua 5:** completați formularul de feedback.

## Scenarii de verificat

| # | Scenariu | Ce urmărim |
| --- | --- | --- |
| 1 | Înregistrare și prima activitate, fără ajutor | Cât durează, unde se blochează |
| 2 | Completare, apoi Undo în 10 secunde | E vizibil butonul? Se înțelege ce se întâmplă cu XP-ul? |
| 3 | Amânare de 2 ori, apoi a treia încercare | Mesajul de limită e clar? |
| 4 | O activitate lăsată să devină restantă | Se observă pierderea de HP? |
| 5 | Crearea unei echipe și intrarea cu cod | Codul e ușor de găsit și de transmis? |
| 6 | Quest: Terminat → validat de un coleg | Colegul vede cererea de validare în timp real? |
| 7 | Respingerea unei completări, cu motiv | Motivul ajunge la cel respins? |
| 8 | Resetarea parolei | Funcționează fluxul (cu linkul trimis manual)? |
| 9 | Tema deschisă/întunecată, web și telefon | Textele sunt lizibile în ambele teme? |
| 10 | Exportul datelor din Profil | Fișierul se descarcă și are sens? |

## Formular de feedback

Scala 1–5 (1 = deloc, 5 = foarte mult):

1. Cât de ușor a fost să creezi și să gestionezi activități?
2. Cât de clar ți-a fost cum se câștigă XP, monede și HP?
3. Te-a motivat jocul să termini activitățile la timp?
4. Cât de utile ți s-au părut echipele și Shared Quests?
5. Cât de mulțumit ești de aspectul aplicației?
6. Ai recomanda aplicația unui coleg?

Răspuns liber:

7. Ce ți-a plăcut cel mai mult?
8. Ce te-a încurcat sau te-a enervat?
9. Ce eroare ai întâlnit? (ce ai făcut, ce s-a întâmplat, pe ce dispozitiv)
10. Ce ai schimba la reguli (recompense, penalizări, limite)?

## Rezultate (de completat după playtest)

| Participanți | Echipe | Activități create | Quest-uri | Perioadă |
| --- | --- | --- | --- | --- |
| | | | | |

| Întrebare | Media (1–5) |
| --- | --- |
| 1. Gestionarea activităților | |
| 2. Claritatea regulilor | |
| 3. Motivația | |
| 4. Echipe și quest-uri | |
| 5. Aspect | |
| 6. Recomandare | |

### Probleme găsite

| # | Problemă | Cine a raportat-o | Gravitate (mare / medie / mică) | Rezolvare (săptămâna 8) | Responsabil |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |

### Ajustări de echilibru

Valorile jocului (XP, monede, HP, plafoane) sunt în `DEFAULT_GAME_CONFIG`, în `packages/shared/src/config.ts`. Serverul, web-ul și aplicația mobilă le citesc de acolo, deci o ajustare înseamnă o modificare în acest fișier și o republicare. Tabela `app_config` primește o copie la `npm run db:seed`, dar serverul nu o citește încă. Notați aici orice schimbare și motivul ei.

| Valoare | Înainte | După | Motiv |
| --- | --- | --- | --- |
| | | | |
