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
# The uploads directory must exist AND belong to `node` before the volume is
# mounted over it: Docker initializes an empty named volume from whatever the
# image has at that path, ownership included. Without this the volume comes up
# owned by root and the app (running as `node`) dies at boot with EACCES on
# mkdir, because main.ts creates the per-theme subfolders.
RUN mkdir -p /repo/apps/backend/uploads && chown -R node:node /repo/apps/backend/uploads
WORKDIR /repo/apps/backend
# Pre-existing non-root user in the node base image — no reason for a
# stateless API process to run as root.
USER node
EXPOSE 5000
CMD ["npm", "start"]
