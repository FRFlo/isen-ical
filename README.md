# ISEN iCal

Cloudflare Worker that serves iCal calendar files from Aurion (ISEN/Junia) via HTTP Basic Authentication.

## Quick Start

```bash
npm install
npm run dev
```

## Usage

### Request Format

```bash
curl -u email@example.com:password https://your-worker.workers.dev/
```

### Responses

| Status | Condition |
|--------|-----------|
| 200 | Valid credentials - returns iCal file with your schedule |
| 401 | Missing or malformed Authorization header |
| 403 | Invalid Aurion credentials |
| 500 | Error fetching schedule from Aurion |

### Example

```bash
curl -u john.doe@isen.yncrea.fr:mypassword http://localhost:8787/
```

## Deployment

```bash
npm run deploy
```

## Project Structure

```
src/
├── index.ts                        # Worker entry point
├── services/
│   ├── auth.service.ts             # Basic auth parsing
│   ├── aurion.service.ts           # Aurion scraper (login + schedule)
│   ├── ical.service.ts             # iCal generation
│   ├── page-parser.service.ts      # HTML parsing utilities
│   └── session.service.ts          # Cookie & HTTP management
└── types/
    └── auth.types.ts               # Auth type definitions
```

## How It Works

1. User sends request with Basic Auth (email + password)
2. Worker logs into Aurion with those credentials
3. Worker navigates to the planning page and fetches schedule data
4. Schedule events are converted to iCal format
5. iCal file is returned to user

## Calendar Subscription

You can subscribe to your calendar in most calendar apps:

- **Google Calendar**: Settings → Add calendar → From URL
- **Apple Calendar**: File → New Calendar Subscription
- **Outlook**: Add calendar → Subscribe from web

Use your worker URL with credentials:
```
https://email%40example.com:password@your-worker.workers.dev/
```

Note: URL-encode the `@` in your email as `%40`.
