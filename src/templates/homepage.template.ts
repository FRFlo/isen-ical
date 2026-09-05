export const HOMEPAGE_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="5;url=https://naurio.fds.ovh/planning?ical=true">
  <title>Calendrier JUNIA - Service déprécié</title>
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
      max-width: 520px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .deprecation-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fef3c7;
      color: #b45309;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 16px;
    }
    h1 {
      color: #1f2937;
      margin-bottom: 12px;
      font-size: 26px;
      font-weight: 700;
    }
    .deprecation-text {
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn-naurio {
      background: #6366f1;
      color: white;
      text-decoration: none;
      font-weight: 600;
      font-size: 17px;
      padding: 14px 24px;
      border-radius: 8px;
      display: block;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
      transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
    }
    .btn-naurio:hover {
      background: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.45);
    }
    .redirect-timer {
      font-size: 14px;
      color: #6b7280;
      margin-top: 16px;
    }
    .cancel-redirect-btn {
      background: none;
      border: none;
      color: #9ca3af;
      text-decoration: underline;
      cursor: pointer;
      font-size: 13px;
      margin-top: 8px;
      display: inline-block;
      transition: color 0.2s;
    }
    .cancel-redirect-btn:hover {
      color: #4b5563;
    }
    .footer {
      margin-top: 36px;
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
      margin: 0 12px;
      vertical-align: middle;
      line-height: 1;
    }
    .footer-link:hover {
      color: #111;
    }
    .footer-icon {
      width: 18px;
      height: 18px;
      display: block;
      flex-shrink: 0;
    }
    .footer-separator {
      display: inline-block;
      width: 1px;
      height: 18px;
      background: #ddd;
      margin: 0 4px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="deprecation-badge">⚠️ Service déprécié</div>
    <h1>Migration vers Naurio</h1>
    <p class="deprecation-text">
      Le service <strong>isen-ical</strong> est désormais déprécié et n'accepte plus de nouveaux abonnements.<br><br>
      Veuillez utiliser la plateforme <strong>Naurio</strong> pour obtenir et synchroniser votre emploi du temps JUNIA.
    </p>

    <a href="https://naurio.fds.ovh/planning?ical=true" id="naurio-btn" class="btn-naurio">
      Accéder à Naurio &rarr;
    </a>

    <div class="redirect-timer" id="redirect-timer-msg">
      Redirection automatique dans <strong id="countdown">5</strong> secondes...
    </div>
    <button type="button" id="cancel-redirect-btn" class="cancel-redirect-btn">
      Annuler la redirection automatique
    </button>

    <footer class="footer">
      <a href="https://naurio.fds.ovh/planning?ical=true" class="footer-link">Naurio</a>
      <span class="footer-separator"></span>
      <a href="/privacy" id="homepage-privacy-link" class="footer-link">Confidentialité</a>
      <span class="footer-separator"></span>
      <a href="https://github.com/FRFlo/isen-ical" id="homepage-github-link" target="_blank" rel="noopener noreferrer" class="footer-link">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/github.svg" alt="GitHub" class="footer-icon">
        <span>GitHub</span>
      </a>
    </footer>
  </div>

  <script>
    const pageRequestId = '{{requestId}}';
    const distinctIdStorageKey = 'isen_ical_distinct_id';
    const userEmailStorageKey = 'isen_ical_user_email';

    const getKnownEmail = () => {
      try {
        return localStorage.getItem(userEmailStorageKey);
      } catch {
        return null;
      }
    };

    const getDistinctId = () => {
      try {
        const existing = localStorage.getItem(distinctIdStorageKey);
        if (existing) {
          return existing;
        }
        const created = crypto.randomUUID();
        localStorage.setItem(distinctIdStorageKey, created);
        return created;
      } catch {
        return 'anonymous';
      }
    };

    const trackEvent = (event, properties = {}) => {
      const distinctId = getDistinctId();
      const email = getKnownEmail();
      fetch('/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': pageRequestId,
          'x-trace-id': pageRequestId,
          'x-distinct-id': distinctId,
        },
        keepalive: true,
        body: JSON.stringify({
          event,
          distinctId,
          properties: {
            ...properties,
            ...(email ? { email } : {}),
          },
        }),
      }).catch(() => {});
    };

    trackEvent('frontend_homepage_viewed');

    const naurioBtn = document.getElementById('naurio-btn');
    const cancelRedirectBtn = document.getElementById('cancel-redirect-btn');
    const redirectTimerMsg = document.getElementById('redirect-timer-msg');
    const countdownEl = document.getElementById('countdown');
    const homepagePrivacyLink = document.getElementById('homepage-privacy-link');
    const homepageGithubLink = document.getElementById('homepage-github-link');

    let countdown = 5;
    let redirectTimer = setInterval(() => {
      countdown -= 1;
      if (countdownEl) {
        countdownEl.textContent = String(countdown);
      }
      if (countdown <= 0) {
        clearInterval(redirectTimer);
        window.location.href = 'https://naurio.fds.ovh/planning?ical=true';
      }
    }, 1000);

    cancelRedirectBtn.addEventListener('click', () => {
      clearInterval(redirectTimer);
      redirectTimerMsg.textContent = 'Redirection automatique annulée.';
      cancelRedirectBtn.style.display = 'none';
      trackEvent('frontend_cancel_redirect_clicked');
    });

    naurioBtn.addEventListener('click', () => {
      clearInterval(redirectTimer);
      trackEvent('frontend_naurio_link_clicked');
    });

    homepagePrivacyLink?.addEventListener('click', () => {
      trackEvent('frontend_homepage_privacy_clicked');
    });

    homepageGithubLink?.addEventListener('click', () => {
      trackEvent('frontend_homepage_github_clicked');
    });
  </script>
</body>
</html>`;
