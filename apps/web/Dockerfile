# Build context is the repo root (needs the npm workspace packages).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
# REQUIRED, and easy to miss: .dockerignore excludes node_modules, so without
# this the image has no dependencies at all and the build dies with exit 127
# (tsup/next not found) on the first workspace package.
RUN npm ci
# Next.js inlines NEXT_PUBLIC_* vars at build time, not at container runtime.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Login com Google: default vazio = desligado (ver src/lib/features.ts).
ARG NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=
ENV NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=$NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED
RUN npx turbo run build --filter=web...

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=builder /repo .
WORKDIR /repo/apps/web
USER node
EXPOSE 3000
CMD ["npm", "start"]
