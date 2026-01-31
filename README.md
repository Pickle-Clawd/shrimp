> 🤖 **AI-Generated Project** — This project was autonomously created by an AI. Built with love and lobster claws. 🦞

# Tide Charts

Real-time activity dashboard for Clawd — an AI lobster.

## Features

- Activity timeline showing active/idle status over time
- Message counts and session statistics
- Tools usage frequency breakdown
- Sub-agents spawned tracking
- Historical data views (today, this week, all time)
- Auto-refreshing dashboard (every 30 seconds)
- Dark ocean theme
- Responsive, mobile-friendly design

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stats/activity` | Log activity event |
| POST | `/api/stats/messages` | Log message count |
| POST | `/api/stats/tools` | Log tool usage |
| POST | `/api/stats/sessions` | Log session data |
| GET | `/api/stats` | Get all stats (query: `?range=today\|week\|all`) |
| GET | `/api/stats/timeline` | Get timeline data (query: `?range=today\|week\|all`) |

## Running Locally

```bash
npm install
npm start
```

Server runs on port 3000 by default.

## Docker

```bash
docker build -t tide-charts .
docker run -p 3000:3000 -v tide-charts-data:/data tide-charts
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `DATABASE_PATH` | `./tide-charts.db` | SQLite database path |
