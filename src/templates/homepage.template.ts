export const HOMEPAGE_TEMPLATE = `<!DOCTYPE html>
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
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
    }
    .footer-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #666;
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
      margin: 0 16px;
      vertical-align: middle;
      line-height: 1;
    }
    .footer-link:hover {
      color: #333;
    }
    .footer-icon {
      width: 20px;
      height: 20px;
      display: block;
      flex-shrink: 0;
    }
    .footer-separator {
      display: inline-block;
      width: 1px;
      height: 20px;
      background: #ddd;
      margin: 0 8px;
      vertical-align: middle;
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
    <a href="{{webcalUrl}}" id="webcal-btn" class="btn">Ajouter à mon calendrier</a>

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
        3. Cliquez sur le "+" à côté de "Autres agendas"<br>
        4. Sélectionnez "À partir de l'URL"<br>
        5. Collez l'URL et cliquez sur "Ajouter un agenda"
      </div>
    </div>

    <footer class="footer">
      <a href="/privacy" class="footer-link">Confidentialité</a>
      <span class="footer-separator"></span>
      <a href="https://github.com/FRFlo/isen-ical" target="_blank" rel="noopener noreferrer" class="footer-link">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/github.svg" alt="GitHub" class="footer-icon">
        <span>Voir sur GitHub</span>
      </a>
    </footer>
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
