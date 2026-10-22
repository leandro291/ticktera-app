# syntax=docker/dockerfile:1
# Targets: `migrate` (drizzle-kit + seed, corre una vez por deploy) y `runner` (la app, último = por defecto).
# Alpine en todas las etapas para que los binarios nativos (sharp) coincidan.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Bundle de CAs de RDS: la app conecta con sslmode=verify-full. NODE_EXTRA_CA_CERTS suma estas CAs a las del sistema.
FROM base AS rds-ca
RUN wget -qO /rds-ca.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* se incrustan al compilar; son claves públicas.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ARG NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
ARG NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
ENV NEXT_TELEMETRY_DISABLED=1
# lib/env exige una URL válida al importar; el Pool de pg es perezoso y el build no se conecta. Solo existe en esta etapa.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build
RUN npm run build

FROM base AS migrate
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/rds-ca.pem
COPY --from=rds-ca /rds-ca.pem /etc/ssl/rds-ca.pem
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npx", "drizzle-kit", "migrate"]

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 NODE_EXTRA_CA_CERTS=/etc/ssl/rds-ca.pem
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=rds-ca /rds-ca.pem /etc/ssl/rds-ca.pem
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
