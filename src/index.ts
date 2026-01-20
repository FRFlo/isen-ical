import { AuthService } from './services/auth.service';
import { AurionService } from './services/aurion.service';
import { ICalService } from './services/ical.service';

const icalService = new ICalService();

export default {
  async fetch(request: Request): Promise<Response> {
    const authHeader = request.headers.get('Authorization');

    const parseResult = AuthService.parseAuthorizationHeader(authHeader);

    if (!parseResult.success) {
      if (parseResult.reason === 'missing_header') {
        return new Response('Authorization required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="ISEN Calendar"',
          },
        });
      }

      return new Response('Invalid authorization format', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="ISEN Calendar"',
        },
      });
    }

    const { username, password } = parseResult.credentials;

    try {
      const aurionService = new AurionService();
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
  },
};
