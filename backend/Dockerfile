# 后端 Dockerfile: Bun + Prisma 多阶段构建
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
RUN bunx prisma generate

FROM oven/bun:1.3-alpine
WORKDIR /app
RUN apk add --no-cache curl openssl
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY src ./src
COPY prisma ./prisma
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run prisma/seed.ts && bun run src/index.ts"]
