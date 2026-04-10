# 빌드 단계
FROM node:20.19-slim as builder

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install @rollup/rollup-linux-x64-gnu --no-save

COPY . .
RUN npm run build

# 실행 단계
FROM caddy:alpine

COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80
