# Build context is the repo root (needs the npm workspace packages). Plain
# alpine is enough here — unlike Brainy-Career's worker, this one settles
# bets (BullMQ + Prisma only) and never touches Playwright/a headless browser.
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=worker...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
WORKDIR /repo/apps/worker
USER node
CMD ["npm", "start"]
