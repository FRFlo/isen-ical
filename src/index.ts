import { AuthService } from './services/auth.service';
import { ICalService } from './services/ical.service';

const authService = new AuthService();
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
    const validationResult = await authService.validate(username, password);

    if (!validationResult.success) {
      return new Response('Invalid credentials', {
        status: 403,
      });
    }

    const ical = icalService.generatePlaceholder(username);

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${username}-calendar.ics"`,
      },
    });
  },
};
