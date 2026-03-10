# ISEN iCal

Worker Cloudflare qui génère des fichiers iCal à partir du planning Aurion (ISEN/JUNIA) avec authentification sécurisée et gestion avancée des tokens.

## Démarrage rapide

```bash
npm install
npm run dev
```

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

- **Cache des événements** : Les données du planning sont mises en cache pendant 1 heure (3600 secondes) pour réduire les appels à Aurion
- **Gestion des sessions** : Les cookies de session sont stockés et réutilisés pendant 1 heure pour éviter les reconnexions fréquentes
- **Récupération automatique** : En cas d'expiration de session, reconnexion automatique transparente
- **Déduplication des requêtes** : Les requêtes simultanées pour les mêmes données sont automatiquement dédupliquées pour éviter les appels redondants à Aurion
- **Hachage sécurisé** : Les clés de cache utilisent SHA-256 pour garantir l'unicité et prévenir les collisions

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
| 500 | Erreur lors de la récupération du planning |

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

- **Cache des événements** : Les données du planning sont mises en cache dans KV avec une clé basée sur un hash SHA-256 des credentials et la période demandée
- **Déduplication des requêtes** : Un système de verrous empêche les requêtes simultanées pour les mêmes données, réduisant la charge sur Aurion
- **Sessions Aurion** : Les cookies de session sont stockés dans KV avec une durée de vie de 1 heure
- **Isolation par utilisateur** : Chaque utilisateur a sa propre clé de cache et de session, garantissant l'isolation des données

### Données stockées

Le service stocke uniquement dans Cloudflare KV :

1. **SESSIONS** : Cookies de session Aurion (durée de vie : 1 heure)
2. **CACHE** : Événements du planning mis en cache (durée de vie : 1 heure)
3. **TOKENS** : Tokens chiffrés avec leurs métadonnées (pas d'expiration automatique, suppression manuelle ou lors de la rotation)

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
│   ├── aurion.service.ts           # Scraper Aurion (login + récupération planning)
│   ├── ical.service.ts             # Génération iCal avec parsing intelligent
│   ├── template.service.ts         # Gestion et rendu des templates HTML
│   ├── token.service.ts            # Gestion des tokens et chiffrement
│   ├── page-parser.service.ts      # Utilitaires de parsing HTML
│   └── session.service.ts          # Gestion des cookies et sessions HTTP
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
2. Le worker vérifie le cache pour les événements
3. Si non trouvé, le worker vérifie la session stockée
4. Si pas de session valide, connexion à Aurion
5. Navigation vers la page de planning et récupération des données
6. Mise en cache des événements et de la session
7. Conversion des événements en format iCal
8. Retour du fichier iCal à l'utilisateur

### Flux avec tokens

1. L'utilisateur génère un token via l'interface web
2. Les credentials sont chiffrés avec AES-GCM et une clé unique
3. Le token et les données chiffrées sont stockés dans KV
4. Une URL d'abonnement est générée avec le token et la clé
5. Lors de l'accès à l'URL, les credentials sont déchiffrés
6. Le flux de récupération du planning est identique à Basic Auth

### Parsing intelligent

Le service parse automatiquement les événements Aurion pour extraire :
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
