# 后端 Dockerfile: Bun + Prisma
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN bun install
RUN bunx prisma generate
COPY . .

FROM oven/bun:1.3-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run prisma/seed.ts && bun run src/index.ts"]
