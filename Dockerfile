FROM node:22-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/shrimp.db

EXPOSE 8080

CMD ["node", "src/server.js"]
