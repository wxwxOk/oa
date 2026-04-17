# 前端 Dockerfile: 构建 Quasar SPA -> Nginx
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx quasar build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist/spa /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
