# Securitate și teste de abuz

Raportul pentru sarcina „Teste de securitate și abuz” (săptămânile 6–7). Testele sunt în `apps/api/test/security.e2e-spec.ts` și rulează în CI la fiecare pull request, împreună cu restul testelor.

## Măsuri existente

| Zonă | Măsură |
| --- | --- |
| Parole | Hash Argon2. La login cu un email inexistent se verifică totuși un hash fals, ca timpul de răspuns să nu dezvăluie conturile. Parole de 10–128 de caractere. |
| Sesiuni | Token de acces JWT (HS256, 15 minute), ținut doar în memorie pe web. Refresh token în cookie `HttpOnly`, `SameSite=Lax`, `Secure` în producție, limitat la `/api/v1/auth`. Se rotește la fiecare folosire; refolosirea unui token vechi revocă toate sesiunile. În baza de date se păstrează doar hash-ul. |
| Conturi | Schimbarea parolei închide celelalte sesiuni. Resetarea are link de unică folosință și același răspuns pentru emailuri inexistente. Ștergerea contului cere parola. Un token rămas de la un cont șters nu mai deschide nimic. |
| Izolarea datelor | Fiecare interogare filtrează după utilizator sau după echipă. O resursă a altcuiva arată ca una inexistentă (404), nu ca una interzisă. |
| Validare | Toate corpurile cererilor trec prin scheme Zod comune cu clientul. Editarea profilului și a activităților acceptă doar câmpurile permise (obiecte stricte). XP, monedele, HP-ul și starea nu se pot trimite din client. |
| Limitarea cererilor | 100 de cereri pe minut per IP. Autentificarea și resetarea parolei au limite proprii (10, respectiv 5 pe minut). Exportul de date și ștergerea contului: 5 pe minut. |
| Antete HTTP | Helmet: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, fără `X-Powered-By`. CORS doar pentru originea configurată. |
| Erori | Toate erorile au forma `{ code, message }`, fără stack trace sau detalii despre baza de date. |
| Reguli anti-farming | Sub 60 de secunde de la creare, finalizarea nu dă nimic. Plafonul Stamina (150 XP pe zi de joc). Undo o singură dată. Maximum 30 de activități create pe zi și 100 active. Validatorul primește XP de cel mult 3 ori pe zi. Bonusul de grup, de cel mult 3 ori pe zi per echipă. Tranzacții cu rânduri blocate, ca cererile simultane să nu dubleze recompensele. |
| Timp real | Conexiunea socket.io cere un token valid. Fiecare client primește doar evenimentele echipei lui; la plecarea din echipă e scos imediat din cameră. |

## Ce verifică suita de teste

| Grup | Teste |
| --- | --- |
| Autentificare | Toate cele 27 de rute protejate răspund 401 fără token. Tokenuri falsificate (altă cheie, `alg: none`, expirate, cu conținutul schimbat) sunt refuzate. Tokenul unui cont șters nu mai funcționează. Login-ul nu dezvăluie dacă un email există. Atributele cookie-ului. Niciun răspuns nu conține hash-uri. |
| Antete | Antetele helmet și CORS doar pentru originea permisă. |
| Izolare | Acțiuni pe quest-urile altei echipe, scoaterea unui membru din altă echipă, accesul după plecarea din echipă, marcarea pentru alți participanți, validarea fără „Terminat”. |
| Câmpuri impuse | XP, monede sau HP trimise la înregistrare, `PATCH /me` cu câmpuri de joc, crearea unei activități în contul altcuiva, schimbarea stării sau a dificultății prin `PATCH`. |
| Intrări ostile | SQL și HTML în titluri (se salvează ca text), coduri de invitație cu caractere speciale, texte prea lungi, tipuri greșite, JSON invalid, corpuri de 2 MB, identificatori invalizi în URL. |
| Abuz al regulilor | Bucle Completă → Undo → Completă, ștergerea după finalizare, 30 de finalizări rapide, cereri simultane, doi colegi care își validează reciproc 6 quest-uri. |
| Limitare | Al 11-lea login pe minut primește 429, la fel a 6-a cerere de resetare. |
| Timp real | Conexiuni fără token, cu token fals sau expirat. Evenimentele nu ajung la alte echipe sau la un membru scos. |

## Probleme găsite și rezolvate

1. **Tokenul unui cont șters funcționa încă până la 15 minute** pe unele rute (`GET /tasks` răspundea 200 cu o listă goală). Acum gardianul de autentificare și conexiunea în timp real verifică și că acel cont există.
2. **Un corp de cerere prea mare primea eroarea 500.** Erorile parserului (corp prea mare, JSON invalid) primesc acum statusul corect (413, respectiv 400) și un mesaj curat.
3. Verificarea JWT acceptă explicit doar algoritmul HS256.
4. **Auditul dependențelor din CI** a eșuat din cauza pachetului `effect` (ReDoS, severitate mare), adus de Prisma. Este fixat la versiunea reparată 3.22.5 prin `overrides` în `package.json`.

## Riscuri rămase, acceptate pentru versiunea 1

- Tokenul de acces rămâne valid până la 15 minute după schimbarea parolei (refresh token-urile se revocă imediat). Se poate reduce cu o versiune a sesiunii în token, dacă va fi nevoie.
- Linkurile de resetare se scriu în logul serverului până la conectarea unui furnizor de email.
- Limitarea cererilor se ține în memoria serverului și se resetează la repornire. E suficient pentru o singură instanță; la mai multe instanțe ar trebui Redis.
- `npm audit` raportează 3 probleme de severitate moderată în `minimatch`, prin Expo (doar aplicația mobilă, doar la build). Singura reparație propusă este o versiune mai veche de Expo, deci așteptăm o actualizare Expo.
- Colegii din aceeași rețea (de exemplu, Wi-Fi-ul facultății) au același IP public, deci împart limita de 10 login-uri pe minut. La playtest, autentificați-vă pe rând.
