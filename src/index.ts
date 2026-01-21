import { AuthService } from './services/auth.service';
import { AurionService } from './services/aurion.service';
import { ICalService } from './services/ical.service';

export interface Env {
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
}

const icalService = new ICalService();

function generateHomepage(baseUrl: string): string {
  const url = new URL(baseUrl);
  const webcalUrl = `webcal://${url.host}/`;
  
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calendrier JUNIA - Abonnement</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #3f2a56 0%, #2d1d3f 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 32px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 40px;
      font-size: 16px;
    }
    .btn {
      width: 100%;
      padding: 16px 24px;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
      background: #e85c30;
      color: white;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(232, 92, 48, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📅 Calendrier JUNIA</h1>
    <p class="subtitle">Ajoutez votre calendrier à votre application préférée</p>
    
    <a href="${webcalUrl}" class="btn">Ajouter à mon calendrier</a>
  </div>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const acceptHeader = request.headers.get('Accept') || '';
    const isHtmlRequest = acceptHeader.includes('text/html');
    
    if (isHtmlRequest) {
      const url = new URL(request.url);
      const baseUrl = url.origin;
      const homepage = generateHomepage(baseUrl);
      
      return new Response(homepage, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const authHeader = request.headers.get('Authorization');
    const parseResult = AuthService.parseAuthorizationHeader(authHeader);

    if (parseResult.success) {
      const { username, password } = parseResult.credentials;

      try {
        const aurionService = new AurionService(env);
        const events = await aurionService.getPlanning(username, password);
        const ical = icalService.fromAurionEvents(events, username);

        return new Response(ical, {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${username}-calendar.ics"`,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

        if (
          message.includes('Login failed') ||
          message.includes('No session cookie')
        ) {
          return new Response('Invalid credentials', {
            status: 403,
          });
        }

        return new Response(`Error fetching schedule: ${message}`, {
          status: 500,
        });
      }
    }

    const isCalendarRequest = acceptHeader.includes('text/calendar');
    
    if (isCalendarRequest) {
      if (parseResult.reason === 'missing_header') {
        return new Response('Authorization required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Calendrier JUNIA"',
          },
        });
      }

      return new Response('Invalid authorization format', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Calendrier JUNIA"',
        },
      });
    }

    const url = new URL(request.url);
    const baseUrl = url.origin;
    const homepage = generateHomepage(baseUrl);
    
    return new Response(homepage, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  },
};
