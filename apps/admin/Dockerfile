# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

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
