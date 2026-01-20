# ISEN iCal

Cloudflare Worker that serves iCal calendar files via HTTP Basic Authentication.

## Quick Start

```bash
npm install
npm run dev
```

## Usage

### Request Format

```bash
curl -u username:password https://your-worker.workers.dev/
```

### Responses

| Status | Condition |
|--------|-----------|
| 200 | Valid credentials - returns iCal file |
| 401 | Missing or malformed Authorization header |
| 403 | Invalid credentials |

### Example

```bash
curl -u john:secret123 http://localhost:8787/
```

## Deployment

```bash
npm run deploy
```

## Project Structure

```
src/
├── index.ts                 # Worker entry point
├── services/
│   ├── auth.service.ts      # Modular authentication service
│   └── ical.service.ts      # iCal generation service
└── types/
    └── auth.types.ts        # TypeScript interfaces
```

## Extending Authentication

The `AuthService` accepts a custom validation function:

```typescript
import { AuthService } from './services/auth.service';

const authService = new AuthService({
  validateFn: async (username, password) => {
    const response = await fetch('https://api.example.com/validate', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return response.ok;
  },
});
```
