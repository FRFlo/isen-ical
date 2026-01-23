import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types';
import { AuthService } from './services/auth.service';
import { AurionService } from './services/aurion.service';
import { ICalService } from './services/ical.service';
import { TokenService } from './services/token.service';
import { TemplateService, TemplateName } from './services/template.service';

export interface Env {
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  TOKENS: KVNamespace;
  MAX_TOKENS_PER_USER?: number;
}

const icalService = new ICalService();

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const maxAgeDays = 365;
    const result = await TokenService.cleanupOrphanTokens(
      env.TOKENS,
      maxAgeDays
    );
    console.log(
      `Nettoyage des tokens orphelins terminé: ${result.cleaned} tokens supprimés, ${result.errors} erreurs`
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === 'POST' && pathname === '/api/generate-token') {
      try {
        const body = await request.json() as { username: string; password: string };
        
        if (!body.username || !body.password) {
          return new Response(
            JSON.stringify({ error: 'Username and password are required' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        const aurionService = new AurionService(env);
        await aurionService.getPlanning(body.username, body.password, Date.now(), Date.now() + 86400000);

        const token = TokenService.generateToken();
        const encryptionKey = TokenService.generateEncryptionKey();
        
        const maxTokensPerUser = env.MAX_TOKENS_PER_USER ?? 3;
        await TokenService.storeToken(
          env.TOKENS,
          token,
          { username: body.username, password: body.password },
          encryptionKey,
          maxTokensPerUser
        );

        const calendarUrl = `${url.origin}/calendar/${token}?key=${encodeURIComponent(encryptionKey)}`;

        return new Response(
          JSON.stringify({ token, encryptionKey, url: calendarUrl }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (
          message.includes('Login failed') ||
          message.includes('No session cookie')
        ) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({ error: `Error: ${message}` }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (method === 'GET' && pathname.startsWith('/calendar/')) {
      const token = pathname.split('/calendar/')[1];
      const encryptionKey = url.searchParams.get('key');

      if (!token || !encryptionKey) {
        return new Response('Token and encryption key are required', {
          status: 400,
        });
      }

      try {
        const credentials = await TokenService.getCredentials(
          env.TOKENS,
          token,
          encryptionKey
        );

        if (!credentials) {
          return new Response('Invalid token', {
            status: 404,
          });
        }

        const aurionService = new AurionService(env);
        const events = await aurionService.getPlanning(
          credentials.username,
          credentials.password
        );
        const ical = icalService.fromAurionEvents(events);

        return new Response(ical, {
          status: 200,
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="isen-ical.ics"',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

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

    if (method === 'GET' && pathname === '/privacy') {
      const privacyPage = TemplateService.renderTemplate(TemplateName.PRIVACY, {});
      
      return new Response(privacyPage, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const acceptHeader = request.headers.get('Accept') || '';
    const baseUrl = url.origin;
    
    if (acceptHeader.includes('text/html')) {
      const urlObj = new URL(baseUrl);
      const webcalUrl = `webcal://${urlObj.host}/`;
      const homepage = TemplateService.renderTemplate(TemplateName.HOMEPAGE, {
        webcalUrl,
      });
      
      return new Response(homepage, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    const authHeader = request.headers.get('Authorization');
    const parseResult = AuthService.parseAuthorizationHeader(authHeader);

    if (!parseResult.success) {
      return new Response(
        parseResult.reason === 'missing_header'
          ? 'Authorization required'
          : 'Invalid authorization format',
        {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Identifiants Aurion"',
          },
        }
      );
    }

    const { username, password } = parseResult.credentials;

    try {
      const aurionService = new AurionService(env);
      const events = await aurionService.getPlanning(username, password);
      const ical = icalService.fromAurionEvents(events);

      return new Response(ical, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="isen-ical.ics"',
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
  },
};
