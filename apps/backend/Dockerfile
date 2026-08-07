# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
RUN npm ci
RUN npx turbo run build --filter=backend...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
WORKDIR /repo/apps/backend
# Pre-existing non-root user in the node base image — no reason for a
# stateless API process to run as root.
USER node
EXPOSE 5000
CMD ["npm", "start"]
