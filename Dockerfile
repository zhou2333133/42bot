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
ARG VITE_API_BASE=http://127.0.0.1:4210
ARG VITE_API_AUTH_TOKEN=
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_API_AUTH_TOKEN=$VITE_API_AUTH_TOKEN
RUN npm run build

EXPOSE 4210 4220
