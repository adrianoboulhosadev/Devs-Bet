FROM node:20-alpine AS builder
WORKDIR /repo
COPY . .
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
