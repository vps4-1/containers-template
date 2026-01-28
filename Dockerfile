# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

WORKDIR /app

# 复制 package.json
COPY container_src/package.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY container_src/ ./

# 生产环境
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app /app

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]
