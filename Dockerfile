# DeadlineHero: o singură imagine cu API-ul (NestJS) care servește și aplicația web (React).
# Construire locală:  docker build -t deadlinehero .
FROM node:22-slim

# Prisma are nevoie de OpenSSL pentru conexiunea la PostgreSQL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Întâi doar fișierele de dependențe, ca stratul cu node_modules să fie refolosit din cache.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Aplicația mobilă nu intră în imagine.
RUN npm ci --include-workspace-root \
  -w @deadlinehero/shared -w @deadlinehero/api -w @deadlinehero/web

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
WORKDIR /app/apps/api
# Migrările se aplică la fiecare pornire (comanda nu face nimic dacă baza e la zi).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
