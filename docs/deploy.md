# Publicarea online (Render)

Aplicația rulează ca **un singur serviciu**: API-ul NestJS servește și aplicația web (build-ul React) de pe aceeași adresă. Așa cookie-ul de refresh (`SameSite=Lax`) și conexiunea în timp real funcționează fără setări CORS între domenii diferite. Baza de date este un PostgreSQL 16 separat.

Fișierele folosite:

| Fișier | Rol |
| --- | --- |
| `Dockerfile` | Construiește imaginea: instalează dependențele (fără aplicația mobilă), compilează `shared`, API-ul și aplicația web. La pornire aplică migrările și pornește serverul. |
| `render.yaml` | Blueprint Render: serviciul web `deadlinehero` și baza de date `deadlinehero-db`, ambele pe planul gratuit, în Frankfurt. |
| `.dockerignore` | Ține în afara imaginii `node_modules`, fișierele `.env`, aplicația mobilă și documentele. |

## Pași (o singură dată)

1. Creați un cont pe [render.com](https://render.com) cu contul de GitHub care are acces la repository.
2. **New → Blueprint**, alegeți repository-ul `SOPM`. Render citește `render.yaml` și propune serviciul și baza de date.
3. Confirmați cu **Apply**. Primul build durează aproximativ 5–8 minute.
4. Când serviciul apare ca **Live**, deschideți adresa lui (de forma `https://deadlinehero.onrender.com`). Verificarea de sănătate este `GET /api/v1/health`.

Serviciul se republică automat la fiecare push pe `main`.

## Variabile de mediu

| Variabilă | Valoare pe Render |
| --- | --- |
| `DATABASE_URL` | Vine automat din baza de date `deadlinehero-db`. |
| `JWT_ACCESS_SECRET` | Generată de Render la prima publicare. Dacă o schimbați, toți utilizatorii trebuie să se autentifice din nou. |
| `NODE_ENV` | `production` (activează cookie-ul `Secure`). |
| `CORS_ORIGIN`, `APP_URL` | Nu trebuie setate: iau adresa serviciului din `RENDER_EXTERNAL_URL`. Setați-le doar pentru un domeniu propriu. |

## Limitele planului gratuit

- **Serviciul adoarme** după 15 minute fără cereri. Prima încărcare după aceea durează aproximativ un minut. Înainte de playtest sau de demo, deschideți aplicația cu câteva minute înainte.
- Job-urile periodice (restanțe, ziua de joc, validarea automată după 48 h) rulează doar cât serviciul e treaz. Nu se pierde nimic: activitățile restante se evaluează și la fiecare citire, iar `daily-rollover` recuperează zilele ratate (până la 7).
- **Baza de date gratuită expiră după 30 de zile.** Creați-o cât mai aproape de playtest (săptămâna 7), ca să țină până la demo. Pentru mai mult timp: planul plătit sau o bază externă (de exemplu Neon), cu `DATABASE_URL` setat manual.
- Linkurile de resetare a parolei se scriu în **logul serviciului** (Render → Logs), pentru că versiunea 1 nu are un furnizor de email (decizia 6 din specificații). În playtest, un membru al echipei poate trimite linkul manual.

## Verificare locală a imaginii

Cu baza de date locală pornită (`docker compose up -d db`):

```bash
docker build -t deadlinehero .
docker run --rm -p 8080:3000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/deadlinehero \
  -e JWT_ACCESS_SECRET=un-secret-local-de-cel-putin-32-de-caractere \
  -e RENDER_EXTERNAL_URL=http://localhost:8080 \
  -e COOKIE_SECURE=false \
  deadlinehero
```

Aplicația este apoi pe http://localhost:8080.

## Aplicația mobilă față de serverul publicat

Porniți Expo cu adresa serverului:

```bash
EXPO_PUBLIC_API_URL=https://deadlinehero.onrender.com/api/v1 npm run dev:mobile
```

Pe Windows (PowerShell): `$env:EXPO_PUBLIC_API_URL="https://deadlinehero.onrender.com/api/v1"; npm run dev:mobile`.
