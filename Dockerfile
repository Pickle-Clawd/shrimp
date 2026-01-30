FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/shrimp.db

EXPOSE 8080

CMD ["node", "src/server.js"]
