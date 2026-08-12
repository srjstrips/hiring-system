# Multi-stage build for the hiring app backend (Node/Express + Prisma).

# ---- builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Alpine ships without OpenSSL by default. Prisma needs it present *before*
# `prisma generate` runs so it can detect the real OpenSSL version and fetch
# the matching engine binary (otherwise it silently guesses wrong and the
# engine fails to load its shared libs later).
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---- runner -----------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Needed at runtime too -- the Prisma query/schema engine binary dynamically
# links against libssl, which Alpine doesn't include by default.
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Prisma client is generated into node_modules/.prisma and node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

# Persisted via named volumes in docker-compose.yml
RUN mkdir -p uploads logs

EXPOSE 5000

# Applies any pending Prisma migrations, then starts the server.
# Safe to re-run on every container start -- migrate deploy is idempotent.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
