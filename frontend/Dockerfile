# 前端 Dockerfile: Bun 构建 Quasar SPA -> Nginx
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN bun run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1
