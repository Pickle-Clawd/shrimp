FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
ENV npm_config_build_from_source=true
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/shrimp.db

EXPOSE 8080

CMD ["node", "src/server.js"]
