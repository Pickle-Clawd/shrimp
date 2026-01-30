FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN chmod +x start.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/shrimp.db

EXPOSE 8080

CMD ["/bin/sh", "/app/start.sh"]
