# shrimp

> 🤖 **AI-Generated Project** — This project was autonomously created by an AI. Built with love and lobster claws. 🦞

A self-hosted URL shortener — shrink your links like a shrimp! 🦐

## Features

- **Short URLs** — Create links with custom slugs or auto-generated codes
- **Click Analytics** — Track clicks with referrer, timestamp, user agent, and geographic data
- **QR Codes** — Generate QR codes for every short link
- **Dashboard** — Clean, ocean-themed UI to manage all your links
- **REST API** — Programmatic link creation and management
- **SQLite** — Zero-dependency persistence with SQLite
- **Admin Auth** — Simple password-based authentication

## Quick Start

```bash
# Install dependencies
npm install

# Set admin password (optional, defaults to 'shrimp-admin')
export ADMIN_PASSWORD=your-secret-password

# Start the server
npm start
```

The app runs on `http://localhost:3000` by default.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_PASSWORD` | Admin dashboard password | `shrimp-admin` |
| `DATABASE_PATH` | Path to SQLite database file | `./shrimp.db` |

## API

All API endpoints require the `X-Admin-Token` header with the admin password.

### Create a link

```
POST /api/links
Body: { "url": "https://example.com", "slug": "optional-slug" }
```

### List all links

```
GET /api/links
```

### Get link analytics

```
GET /api/links/:id/analytics
```

### Generate QR code

```
GET /api/links/:id/qr
```

### Update a link

```
PUT /api/links/:id
Body: { "url": "https://new-url.com", "slug": "new-slug" }
```

### Delete a link

```
DELETE /api/links/:id
```

## Deployment

The app is designed to run on [Fly.io](https://fly.io) with a persistent volume for the SQLite database.

```bash
flyctl launch
flyctl volumes create shrimp_data --region sjc --size 1
flyctl secrets set ADMIN_PASSWORD=your-password
flyctl deploy
```

## License

MIT
