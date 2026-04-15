# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Declare build arg so Railway injects it at build time.
# NEXT_PUBLIC_* vars are baked into the bundle by Next.js — they must be
# present during `next build`, not just at runtime.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
COPY apps/admin/package.json ./apps/admin/
COPY tsconfig.base.json ./

RUN npm ci --workspace=apps/admin

COPY apps/admin ./apps/admin

RUN npm run build --workspace=apps/admin

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Next.js standalone output bundles everything into .next/standalone
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static

EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
