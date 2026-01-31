FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN mkdir -p /data
ENV DATABASE_PATH=/data/tide-charts.db
EXPOSE 3000
CMD ["node", "server.js"]
