import { AuthService } from './services/auth.service';
import { AurionService } from './services/aurion.service';
import { ICalService } from './services/ical.service';
import { TokenService } from './services/token.service';

export interface Env {
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  TOKENS: KVNamespace;
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
      margin-bottom: 30px;
      font-size: 16px;
    }
    .section-title {
      color: #333;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .section-icon {
      width: 20px;
      height: 20px;
    }
    .divider {
      display: flex;
      align-items: center;
      margin: 28px 0;
    }
    .divider-line {
      flex: 1;
      height: 1px;
      background: #ddd;
    }
    .divider-text {
      padding: 0 16px;
      color: #999;
      font-size: 14px;
      font-weight: 500;
    }
    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }
    .form-label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: #e85c30;
      outline: none;
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
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .error {
      color: #d32f2f;
      font-size: 14px;
      margin-top: 8px;
      text-align: left;
    }
    .success {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      text-align: left;
    }
    .url-display {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      word-break: break-all;
      font-family: monospace;
      margin: 12px 0;
      color: #333;
    }
    .btn-secondary {
      background: #4285f4;
      margin-top: 8px;
    }
    .btn-secondary:hover {
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
    }
    .instructions {
      font-size: 13px;
      color: #666;
      margin-top: 12px;
      line-height: 1.6;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📅 Calendrier JUNIA</h1>
    <p class="subtitle">Ajoutez votre calendrier à votre application préférée</p>

    <div class="section-title">
      <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/apple.svg" alt="Apple" class="section-icon">
      <span>iOS / macOS</span>
    </div>
    <a href="${webcalUrl}" id="webcal-btn" class="btn">Ajouter à mon calendrier</a>

    <div class="divider">
      <div class="divider-line"></div>
      <div class="divider-text">OU</div>
      <div class="divider-line"></div>
    </div>

    <div class="section-title">
      <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/google.svg" alt="Google" class="section-icon">
      <span>Google Calendar</span>
    </div>

    <form id="token-form">
      <div class="form-group">
        <label class="form-label" for="email">Email Aurion</label>
        <input type="email" id="email" class="form-input" required autocomplete="username">
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Mot de passe</label>
        <input type="password" id="password" class="form-input" required autocomplete="current-password">
      </div>
      <div id="error-message" class="error hidden"></div>
      <button type="submit" id="generate-btn" class="btn">Générer l'URL d'abonnement</button>
    </form>

    <div id="success-section" class="success hidden">
      <strong>URL générée avec succès !</strong>
      <div class="url-display" id="calendar-url"></div>
      <a id="google-calendar-link" href="#" target="_blank" class="btn btn-secondary" style="display: none;">Ajouter à Google Calendar</a>
      <button type="button" id="copy-btn" class="btn btn-secondary">Copier l'URL</button>
      <div class="instructions">
        <strong>Instructions pour Google Calendar :</strong><br>
        Cliquez sur le bouton "Ajouter à Google Calendar" ci-dessus, ou suivez ces étapes manuelles :<br>
        1. Copiez l'URL ci-dessus<br>
        2. Ouvrez Google Calendar<br>
        3. Cliquez sur le "+" à côté de "Autres calendriers"<br>
        4. Sélectionnez "À partir de l'URL"<br>
        5. Collez l'URL et cliquez sur "Ajouter le calendrier"
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('token-form');
    const errorMessage = document.getElementById('error-message');
    const successSection = document.getElementById('success-section');
    const calendarUrl = document.getElementById('calendar-url');
    const copyBtn = document.getElementById('copy-btn');
    const generateBtn = document.getElementById('generate-btn');
    const googleCalendarLink = document.getElementById('google-calendar-link');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      errorMessage.classList.add('hidden');
      successSection.classList.add('hidden');
      generateBtn.disabled = true;
      generateBtn.textContent = 'Génération en cours...';

      try {
        const response = await fetch('/api/generate-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la génération');
        }

        calendarUrl.textContent = data.url;
        const encodedUrl = encodeURIComponent(data.url);
        googleCalendarLink.href = \`https://calendar.google.com/calendar/render?cid=\${encodedUrl}\`;
        googleCalendarLink.style.display = 'inline-block';
        successSection.classList.remove('hidden');
      } catch (error) {
        errorMessage.textContent = error.message || 'Une erreur est survenue';
        errorMessage.classList.remove('hidden');
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Générer l\\'URL d\\'abonnement';
      }
    });

    copyBtn.addEventListener('click', () => {
      const url = calendarUrl.textContent;
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = 'Copié !';
        setTimeout(() => {
          copyBtn.textContent = 'Copier l\\'URL';
        }, 2000);
      });
    });
  </script>
</body>
</html>`;
}

export default {
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
        
        await TokenService.storeToken(
          env.TOKENS,
          token,
          { username: body.username, password: body.password },
          encryptionKey
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

    const acceptHeader = request.headers.get('Accept') || '';
    const baseUrl = url.origin;
    
    if (acceptHeader.includes('text/html')) {
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
