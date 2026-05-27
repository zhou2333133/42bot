FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package.json tsconfig.json tsconfig.base.json vitest.config.ts ./
COPY packages/core/package.json packages/core/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/bot/package.json apps/bot/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN npm install

COPY . .
RUN npm run build

EXPOSE 4210 4220
