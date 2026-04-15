# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

# Copy full source
COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Compile TypeScript
RUN npm run build --workspace=apps/api

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/packages/shared ./packages/shared

# Run migrations then start the server
# All deps are hoisted to root node_modules by npm workspaces
CMD ["sh", "-c", \
  "node node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma \
  && node apps/api/dist/index.js"]
