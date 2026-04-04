# ISEN iCal

Worker Cloudflare qui génère des fichiers iCal à partir du planning Aurion (ISEN/JUNIA) avec authentification sécurisée et gestion avancée des tokens.

## Démarrage rapide

```bash
npm install
npm run dev
```

`npm run dev` utilise le runtime Cloudflare distant via `wrangler dev --remote`.
Utilisez `npm run dev:local` uniquement si vous avez besoin du dashboard Localflare et des bindings locaux.

## Développement local et Aurion

Le flux d'authentification Aurion repose sur des requêtes `POST` avec redirections `302` et cookies de session.
En pratique, ce flux est plus fiable dans le runtime Cloudflare réel que dans certains émulateurs locaux.

- **Recommandé pour tester Aurion** : `npm run dev`
- **À réserver au dashboard/bindings locaux** : `npm run dev:local`

Si vous voyez `AURION_TRANSPORT_ERROR` sur `http://127.0.0.1:8787`, testez d'abord avec `npm run dev` avant d'investiguer l'application.

## Fonctionnalités

### Authentification multiple

Le service supporte deux méthodes d'authentification :

1. **HTTP Basic Authentication** (méthode classique)
   - Envoi des identifiants dans l'en-tête `Authorization`
   - Idéal pour les scripts et outils en ligne de commande

2. **Système de tokens sécurisés** (recommandé)
   - Génération de tokens uniques via l'interface web
   - Chiffrement des identifiants avec AES-GCM 256 bits
   - URL d'abonnement sans exposer les credentials

### Interface web

Une page d'accueil permet de :
- Générer des tokens d'abonnement pour Google Calendar
- Obtenir une URL webcal:// pour iOS/macOS
- Copier facilement les URLs d'abonnement

### Cache et performance

- **Cache SDK** : `aurion-sdk` gère le cache transport et session
- **Stockage KV** : Cloudflare KV sert de backend de cache pour le SDK
- **Retry ciblé** : le worker retente sans cache uniquement lors d'une erreur de transport SDK

## Utilisation

### Méthode 1 : HTTP Basic Authentication

```bash
curl -u email@example.com:password https://your-worker.workers.dev/
```

### Méthode 2 : Tokens sécurisés

1. Accédez à l'URL du worker dans un navigateur
2. Remplissez le formulaire avec vos identifiants Aurion
3. Cliquez sur "Générer l'URL d'abonnement"
4. Utilisez l'URL générée dans votre application de calendrier

L'URL générée suit ce format :
```
https://your-worker.workers.dev/calendar/{token}?key={encryptionKey}
```

### Réponses HTTP

| Status | Condition |
|--------|-----------|
| 200 | Identifiants valides - retourne le fichier iCal |
| 400 | Paramètres manquants (token ou clé de chiffrement) |
| 401 | En-tête Authorization manquant ou malformé |
| 403 | Identifiants Aurion invalides |
| 404 | Token invalide ou expiré |
| 502 | Erreur de transport amont lors de la récupération du planning |

## Confidentialité et sécurité

### Stockage des credentials

Les identifiants sont **jamais stockés en clair**. Le système utilise :

- **Chiffrement AES-GCM 256 bits** : Chaque token est associé à une clé de chiffrement unique générée aléatoirement
- **Clé de chiffrement séparée** : La clé de chiffrement n'est jamais stockée avec les données chiffrées, elle doit être fournie dans l'URL
- **IV unique** : Chaque chiffrement utilise un vecteur d'initialisation (IV) unique pour garantir la sécurité

### Gestion des tokens

- **Limite par utilisateur** : Par défaut, chaque utilisateur peut générer jusqu'à 3 tokens simultanés (configurable via `MAX_TOKENS_PER_USER`)
- **Rotation automatique** : Les anciens tokens sont automatiquement supprimés lors de la création d'un nouveau token si la limite est atteinte
- **Stockage KV** : Les tokens sont stockés dans Cloudflare KV avec une structure séparée pour chaque utilisateur

### Cache et sessions

- **Cache géré par le SDK** : `aurion-sdk` gère ses propres clés de cache transport et session
- **Backend KV** : le worker fournit un store Cloudflare KV au SDK
- **Sessions Aurion** : les données de session et de transport mises en cache sont stockées dans KV selon les TTL configurés pour le SDK

### Données stockées

Le service stocke uniquement dans Cloudflare KV :

1. **CACHE** : Entrées de cache SDK (transport + session + valeurs sérialisées)
2. **TOKENS** : Tokens chiffrés avec leurs métadonnées (pas d'expiration automatique, suppression manuelle ou lors de la rotation)

**Important** : Les mots de passe ne sont jamais stockés en clair. Ils sont chiffrés avec AES-GCM avant stockage et nécessitent la clé de chiffrement pour être déchiffrés.

## Abonnement au calendrier

### Google Calendar

1. Utilisez l'interface web pour générer une URL
2. Cliquez sur "Ajouter à Google Calendar" ou suivez les instructions manuelles
3. Le calendrier se mettra à jour automatiquement

### iOS / macOS

1. Utilisez le bouton "Ajouter à mon calendrier" sur la page d'accueil
2. Ou ajoutez manuellement l'URL webcal:// dans l'application Calendrier

### Outlook

1. Copiez l'URL générée
2. Ouvrez Outlook → Ajouter un calendrier → S'abonner à partir du web
3. Collez l'URL

## Déploiement

```bash
npm run deploy
```

### Configuration requise

Le worker nécessite trois namespaces KV configurés dans `wrangler.jsonc` :

- `SESSIONS` : Stockage des sessions Aurion
- `CACHE` : Cache des événements du planning
- `TOKENS` : Stockage des tokens chiffrés

### Variables d'environnement

- `MAX_TOKENS_PER_USER` (optionnel) : Nombre maximum de tokens par utilisateur (défaut : 3)
- `DISABLE_CACHE` (optionnel) : Désactive complètement le cache et la réutilisation de sessions KV (`true`, `1` ou `yes`)
- `POSTHOG_API_KEY` (optionnel) : Clé projet PostHog pour activer la télémétrie backend + frontend
- `POSTHOG_HOST` (optionnel) : URL PostHog (défaut : `https://eu.i.posthog.com`)

## Structure du projet

```
src/
├── index.ts                        # Point d'entrée du worker
├── services/
│   ├── auth.service.ts             # Parsing de l'authentification Basic Auth
│   ├── aurion.service.ts           # Intégration aurion-sdk + cache KV
│   ├── ical.service.ts             # Génération iCal à partir des événements Aurion
│   ├── template.service.ts         # Gestion et rendu des templates HTML
│   ├── token.service.ts            # Gestion des tokens et chiffrement
│   └── telemetry.service.ts        # Télémétrie backend + frontend
├── templates/
│   └── homepage.template.ts        # Template HTML de la page d'accueil
├── types/
│   ├── auth.types.ts               # Types pour l'authentification
│   └── token.types.ts              # Types pour les tokens
└── utils/
    └── crypto.util.ts              # Utilitaires cryptographiques (SHA-256)
```

## Fonctionnement

### Flux avec Basic Auth

1. L'utilisateur envoie une requête avec Basic Auth (email + mot de passe)
2. Le worker instancie une session `aurion-sdk`
3. Le SDK gère son cache via Cloudflare KV
4. Si nécessaire, le SDK authentifie puis récupère le planning via son API typée
5. Conversion des événements en format iCal
6. Retour du fichier iCal à l'utilisateur

### Flux avec tokens

1. L'utilisateur génère un token via l'interface web
2. Les credentials sont chiffrés avec AES-GCM et une clé unique
3. Le token et les données chiffrées sont stockés dans KV
4. Une URL d'abonnement est générée avec le token et la clé
5. Lors de l'accès à l'URL, les credentials sont déchiffrés
6. Le flux de récupération du planning est identique à Basic Auth

### Parsing intelligent

Le service s'appuie sur `aurion-sdk` pour récupérer les événements Aurion et en extraire automatiquement :
- Le titre du cours (avec emojis pour les examens 🎓 et l'auto-apprentissage 🏠)
- Le lieu
- Les informations complémentaires (professeur, type de cours)
- Les dates de début et fin

## Notes de sécurité

- Les credentials sont toujours chiffrés avant stockage
- Les clés de chiffrement ne sont jamais stockées avec les données
- Le cache et les sessions expirent automatiquement après 1 heure
- Chaque utilisateur est isolé avec ses propres clés de cache et session
- La limite de tokens empêche la création excessive de tokens
- Les clés de cache utilisent SHA-256 pour garantir l'unicité et prévenir les collisions de hachage
