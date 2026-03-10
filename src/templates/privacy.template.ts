export const PRIVACY_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confidentialité - Calendrier JUNIA</title>
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
      padding: 40px 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 900px;
      width: 100%;
      margin: 0 auto;
      padding: 40px;
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
    h2 {
      color: #333;
      margin-top: 32px;
      margin-bottom: 16px;
      font-size: 24px;
      border-bottom: 2px solid #e85c30;
      padding-bottom: 8px;
    }
    h3 {
      color: #333;
      margin-top: 24px;
      margin-bottom: 12px;
      font-size: 18px;
    }
    p {
      color: #555;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    ul, ol {
      color: #555;
      line-height: 1.8;
      margin-left: 24px;
      margin-bottom: 16px;
    }
    li {
      margin-bottom: 8px;
    }
    .highlight {
      background: #f5f5f5;
      border-left: 4px solid #e85c30;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .highlight strong {
      color: #e85c30;
    }
    .code {
      background: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      color: #333;
      margin: 12px 0;
      word-break: break-all;
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
    .back-link {
      display: inline-block;
      color: #e85c30;
      text-decoration: none;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .info-box {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .info-box strong {
      color: #1976d2;
    }
    .warning-box {
      background: #fff3e0;
      border: 1px solid #ffb74d;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    .warning-box strong {
      color: #f57c00;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔒 Confidentialité</h1>
    <p class="subtitle">Transparence totale sur le traitement de vos données</p>

    <h2>Vue d'ensemble</h2>
    <p>
      Ce service est conçu avec la confidentialité comme priorité absolue. Le service propose 
      trois méthodes d'authentification, chacune avec des implications différentes en termes 
      de stockage de vos données.
    </p>

    <div class="highlight">
      <strong>Important :</strong> Vos mots de passe ne sont jamais stockés en clair. 
      Lorsqu'un stockage est nécessaire, ils sont chiffrés avec AES-GCM 256 bits avant 
      stockage et nécessitent une clé de chiffrement unique pour être déchiffrés.
    </div>

    <h2>Schémas d'authentification et stockage</h2>

    <h3>1. HTTP Basic Authentication et URL webcal:// (iOS/macOS)</h3>
    <p>
      <strong>Aucun stockage de credentials côté serveur.</strong>
    </p>
    <ul>
      <li><strong>HTTP Basic Authentication :</strong> Vos identifiants sont envoyés dans l'en-tête HTTP à chaque requête. Idéal pour les scripts et outils en ligne de commande.</li>
      <li><strong>URL webcal:// (iOS/macOS) :</strong> Les identifiants sont gérés directement par votre application Calendrier. Votre application envoie les identifiants à chaque synchronisation.</li>
      <li>Aucun stockage permanent de vos credentials sur nos serveurs</li>
      <li>Les identifiants sont utilisés uniquement pour la durée de la requête</li>
    </ul>
    <div class="info-box">
      <strong>Stockage temporaire uniquement :</strong> Seuls les cookies de session et 
      le cache des événements peuvent être stockés temporairement (voir sections ci-dessous). 
      Vos identifiants restent sur votre appareil et ne sont jamais stockés côté serveur.
    </div>

    <h3>2. Tokens sécurisés (Google Calendar et autres)</h3>
    <p>
      <strong>Stockage chiffré des credentials nécessaire.</strong>
    </p>
    <ul>
      <li>Lorsque vous générez un token d'abonnement, vos identifiants sont chiffrés avant stockage</li>
      <li>Le token permet d'accéder au calendrier sans réexposer vos identifiants dans l'URL</li>
      <li>Nécessaire car certaines applications de calendrier ne supportent pas l'authentification Basic Auth</li>
    </ul>
    <div class="info-box">
      <strong>Avantage de sécurité :</strong> La clé de chiffrement n'est envoyée qu'une seule fois 
      au client lors de la génération du token et n'est jamais stockée sur le serveur. 
      <strong>Cela garantit que même en cas d'accès non autorisé aux données du serveur, 
      vos identifiants restent totalement protégés.</strong> Seul le client possédant la clé 
      peut déchiffrer les identifiants, renforçant ainsi la sécurité de vos données.
    </div>

    <h2>Données stockées</h2>
    
    <h3>1. Tokens et identifiants chiffrés (KV namespace: TOKENS)</h3>
    <p>
      <strong>Uniquement pour les tokens sécurisés (méthode 2).</strong> Lorsque vous générez 
      un token d'abonnement, vos identifiants sont chiffrés avant stockage :
    </p>
    <ul>
      <li><strong>Ce qui est stocké :</strong>
        <ul>
          <li>Token unique (UUID)</li>
          <li>Identifiants chiffrés (email + mot de passe chiffrés avec AES-GCM)</li>
          <li>Vecteur d'initialisation (IV) unique pour chaque chiffrement</li>
          <li>Date de création du token</li>
          <li>Email (non chiffré, utilisé uniquement pour l'organisation des tokens)</li>
        </ul>
      </li>
      <li><strong>Clé de chiffrement :</strong> <strong>Jamais stockée sur le serveur.</strong> Elle est envoyée une seule fois au client dans l'URL d'abonnement lors de la génération du token. Cette architecture garantit que même en cas d'accès non autorisé aux données du serveur, vos identifiants restent protégés car la clé de déchiffrement n'est pas présente sur le serveur.</li>
      <li><strong>Durée de vie :</strong> Pas d'expiration automatique, suppression lors de la rotation des tokens ou manuellement</li>
      <li><strong>Limite :</strong> Maximum 3 tokens par utilisateur (configurable)</li>
    </ul>

    <div class="code">
      Structure stockée :<br>
      token:{uuid} → { encrypted: "...", iv: "...", createdAt: timestamp, email: "..." }
    </div>

    <h3>2. Cache des événements (KV namespace: CACHE)</h3>
    <p>
      <strong>Pour toutes les méthodes d'authentification.</strong> Les données du planning 
      sont mises en cache pour améliorer les performances et réduire les appels à Aurion :
    </p>
    <ul>
      <li><strong>Ce qui est stocké :</strong>
        <ul>
          <li>Événements du planning (titres, dates, lieux, descriptions)</li>
          <li>Période couverte par le cache</li>
        </ul>
      </li>
      <li><strong>Clé de cache :</strong> Basée sur un hash SHA-256 des credentials et la période demandée</li>
      <li><strong>Durée de vie :</strong> 1 heure (3600 secondes)</li>
      <li><strong>Isolation :</strong> Chaque utilisateur a sa propre clé de cache</li>
      <li><strong>Déduplication :</strong> Un système de verrous empêche les requêtes simultanées pour les mêmes données</li>
    </ul>

    <div class="code">
      Clé de cache : events:user:{email}:{hashSHA256}:{startTimestamp}:{endTimestamp}<br>
      Contenu : JSON array des événements Aurion
    </div>

    <div class="info-box">
      <strong>Pourquoi le cache ?</strong> Le cache réduit la charge sur les serveurs Aurion 
      et améliore la rapidité de réponse. Les données sont automatiquement rafraîchies après 
      expiration du cache. Le système de déduplication empêche plusieurs requêtes simultanées 
      pour les mêmes données, optimisant encore davantage les performances.
    </div>

    <h3>3. Sessions Aurion (KV namespace: SESSIONS)</h3>
    <p>
      <strong>Pour toutes les méthodes d'authentification.</strong> Les cookies de session 
      sont stockés pour éviter les reconnexions fréquentes :
    </p>
    <ul>
      <li><strong>Ce qui est stocké :</strong>
        <ul>
          <li>Cookies de session Aurion (identifiants de session uniquement)</li>
          <li>Aucune information d'authentification</li>
        </ul>
      </li>
      <li><strong>Clé de session :</strong> Basée sur un hash SHA-256 des credentials</li>
      <li><strong>Durée de vie :</strong> 1 heure (3600 secondes)</li>
      <li><strong>Isolation :</strong> Chaque utilisateur a sa propre session</li>
    </ul>

    <div class="code">
      Clé de session : user:{email}:{hashSHA256}<br>
      Contenu : JSON object avec les cookies de session (format: { cookies: {...}, createdAt: timestamp })
    </div>

    <div class="warning-box">
      <strong>Note importante :</strong> Les sessions expirent automatiquement après 1 heure. 
      En cas d'expiration, une nouvelle connexion est établie automatiquement de manière transparente.
    </div>

    <h2>Chiffrement</h2>

    <h3>Algorithme : AES-GCM 256 bits</h3>
    <p>
      Tous les identifiants sont chiffrés avec l'algorithme AES-GCM (Advanced Encryption Standard 
      en mode Galois/Counter Mode) avec une clé de 256 bits :
    </p>
    <ul>
      <li><strong>Force :</strong> Standard de chiffrement militaire, considéré comme inviolable</li>
      <li><strong>Mode GCM :</strong> Fournit à la fois le chiffrement et l'authentification</li>
      <li><strong>IV unique :</strong> Chaque chiffrement utilise un vecteur d'initialisation unique (12 bytes)</li>
      <li><strong>Clé unique :</strong> Chaque token a sa propre clé de chiffrement générée aléatoirement</li>
    </ul>

    <h3>Processus de chiffrement</h3>
    <ol>
      <li>Génération d'une clé de chiffrement aléatoire (32 bytes)</li>
      <li>Génération d'un IV unique (12 bytes)</li>
      <li>Chiffrement des credentials (email + mot de passe) avec AES-GCM</li>
      <li>Encodage Base64URL des données chiffrées</li>
      <li>Stockage du token, des données chiffrées et de l'IV dans KV</li>
      <li>La clé de chiffrement est envoyée une seule fois au client dans l'URL d'abonnement et <strong>jamais stockée sur le serveur</strong></li>
    </ol>

    <div class="highlight">
      <strong>Sécurité renforcée :</strong> La clé de chiffrement n'est jamais stockée sur le serveur. 
      Elle est transmise une seule fois au client lors de la génération du token. 
      <strong>Cette architecture garantit que même en cas d'accès non autorisé aux données du serveur, 
      vos identifiants restent totalement protégés.</strong> Seul le client possédant la clé peut 
      déchiffrer les identifiants, ce qui renforce considérablement la sécurité de vos données 
      sensibles.
    </div>

    <h2>Isolation des données</h2>
    <p>
      Chaque utilisateur est complètement isolé des autres :
    </p>
    <ul>
      <li><strong>Tokens :</strong> Liste séparée par utilisateur (clé : user:{email}:tokens)</li>
      <li><strong>Cache :</strong> Clé unique basée sur le hash SHA-256 des credentials de l'utilisateur</li>
      <li><strong>Sessions :</strong> Clé unique basée sur le hash SHA-256 des credentials de l'utilisateur</li>
      <li><strong>Verrous de requête :</strong> Verrous temporaires pour dédupliquer les requêtes simultanées (clé : lock:{userKey}:{start}:{end})</li>
    </ul>

    <p>
      Il est impossible pour un utilisateur d'accéder aux données d'un autre utilisateur, même 
      en connaissant son email, car les clés incluent un hash SHA-256 des credentials complets. 
      L'utilisation de SHA-256 garantit l'unicité des clés et prévient les collisions de hachage.
    </p>

    <h2>Durée de conservation</h2>
    <ul>
      <li><strong>Tokens :</strong> Conservés jusqu'à suppression manuelle ou rotation automatique</li>
      <li><strong>Cache :</strong> 1 heure maximum, puis suppression automatique</li>
      <li><strong>Sessions :</strong> 1 heure maximum, puis expiration automatique</li>
    </ul>

    <h2>Accès aux données</h2>
    <p>
      Les données sont stockées dans Cloudflare KV, une base de données distribuée :
    </p>
    <ul>
      <li><strong>Localisation :</strong> Données répliquées dans plusieurs centres de données Cloudflare</li>
      <li><strong>Accès :</strong> Uniquement via l'API Cloudflare Workers (pas d'accès direct)</li>
      <li><strong>Sécurité :</strong> Chiffrement au repos et en transit</li>
    </ul>

    <h2>Vos droits</h2>
    <p>
      Vous avez le contrôle total sur vos données :
    </p>
    <ul>
      <li><strong>Suppression :</strong> Les tokens peuvent être supprimés en ne les utilisant plus (rotation automatique après 3 tokens)</li>
      <li><strong>Transparence :</strong> Ce document détaille exactement ce qui est stocké et comment</li>
      <li><strong>Code source :</strong> Le code est open source et disponible sur GitHub</li>
    </ul>

    <h2>Contact</h2>
    <p>
      Pour toute question concernant la confidentialité ou le traitement de vos données, 
      vous pouvez consulter le code source sur GitHub ou ouvrir une issue.
    </p>

    <footer class="footer">
      <a href="/" id="privacy-home-link" class="footer-link">← Retour à l'accueil</a>
      <span class="footer-separator"></span>
      <a href="https://github.com/FRFlo/isen-ical" id="privacy-github-link" target="_blank" rel="noopener noreferrer" class="footer-link">
        <img src="https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/github.svg" alt="GitHub" class="footer-icon">
        <span>Code source</span>
      </a>
    </footer>
  </div>

  <script>
    const pageRequestId = '{{requestId}}';
    const distinctIdStorageKey = 'isen_ical_distinct_id';

    const getDistinctId = () => {
      const existing = localStorage.getItem(distinctIdStorageKey);
      if (existing) {
        return existing;
      }
      const created = crypto.randomUUID();
      localStorage.setItem(distinctIdStorageKey, created);
      return created;
    };

    const trackEvent = (event, properties = {}) => {
      const distinctId = getDistinctId();
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
          properties,
        }),
      }).catch(() => {});
    };

    trackEvent('frontend_privacy_viewed');

    document.getElementById('privacy-home-link').addEventListener('click', () => {
      trackEvent('frontend_privacy_back_home_clicked');
    });

    document.getElementById('privacy-github-link').addEventListener('click', () => {
      trackEvent('frontend_privacy_github_clicked');
    });
  </script>
</body>
</html>`;
