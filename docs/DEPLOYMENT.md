# Déploiement sur Vercel

Procédure pour mettre en production le dashboard bordeaux-mobility sur Vercel,
avec la clé DataHub Bordeaux Métropole stockée côté serveur (jamais exposée au client).

## Pré-requis

- Un compte Vercel (gratuit, plan Hobby suffit).
- Le repo poussé sur GitHub (`Cilag/bordeaux-mobility`).
- La clé DataHub Bordeaux Métropole à portée de main (la même que dans `.env` local).

## Étapes (à faire une seule fois)

### 1. Installer Vercel CLI

```bash
npm install -g vercel
```

Vérifier :

```bash
vercel --version
```

### 2. Connecter le repo local au projet Vercel

Depuis la racine du repo :

```bash
vercel link
```

- Sélectionner ton scope (perso ou organisation).
- Quand on demande "Link to existing project?" → répondre Non (sauf si tu as déjà créé le projet via le dashboard Vercel).
- Nom du projet : `bordeaux-mobility` (ou ce que tu veux).
- "What's your code's directory?" → laisser `./`.
- Vercel détecte automatiquement Vite. Si la build command est demandée : `npm run build`, output : `dist`.

Cette commande crée `.vercel/project.json` (déjà ignoré par Vercel — on n'a pas besoin de le commit).

### 3. Configurer la variable d'environnement `DATAHUB_API_KEY`

```bash
vercel env add DATAHUB_API_KEY production
```

- Vercel demande la valeur : coller la clé DataHub. Elle est chiffrée et stockée côté serveur.
- Optionnel : refaire la même commande avec `preview` et `development` si tu utilises ces environnements.

Vérifier :

```bash
vercel env ls
```

Doit afficher `DATAHUB_API_KEY` pour l'environnement `Production`.

### 4. Premier déploiement

```bash
vercel --prod
```

Vercel :
1. Build l'app (`npm run build` → `dist/`).
2. Déploie le statique sur l'Edge.
3. Déploie la function `api/datahub/[...path].js`.
4. Renvoie une URL du type `https://bordeaux-mobility-<slug>.vercel.app`.

### 5. Activer l'auto-deploy sur `git push`

Aller sur https://vercel.com/dashboard, ouvrir le projet `bordeaux-mobility`, onglet `Settings` → `Git`.

- Section "Connected Git Repository" : connecter `Cilag/bordeaux-mobility`.
- "Production Branch" : `main`.

À partir de là, chaque `git push origin main` déclenchera un nouveau déploiement.

## Vérifications après déploiement

### La clé n'est pas exposée au client

1. Ouvrir l'URL Vercel dans Chrome.
2. DevTools → Network → filtrer par `datahub`.
3. Cliquer sur une requête `/api/datahub/...` : aucun header ou query string ne doit contenir la clé.
4. DevTools → Sources → chercher dans les chunks JS : la clé ne doit apparaître nulle part.

### Le dashboard fonctionne

1. URL `/dashboard/mobilite` : la carte affiche les arrêts, les KPIs sont calculés, les graphiques sous la carte sont peuplés.
2. URL `/dashboard/stationnement` : idem avec les parkings.

### Les headers de sécurité sont présents

```bash
curl -I https://<projet>.vercel.app/
```

Vérifier la présence de :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Mise à jour

Pour pousser une nouvelle version :

```bash
git push origin main
```

Vercel déclenche automatiquement le build, le déploiement, et le swap atomique. Aucun downtime.

## Rotation de la clé DataHub

Si la clé est compromise ou doit être rotatée :

```bash
vercel env rm DATAHUB_API_KEY production
vercel env add DATAHUB_API_KEY production   # entrer la nouvelle valeur
vercel --prod   # ou attendre le prochain auto-deploy
```

Aucun changement de code requis.

## Troubleshooting

### "DATAHUB_API_KEY not configured" en prod

→ La variable n'est pas définie pour cet environnement. Vérifier `vercel env ls` et re-runner `vercel env add DATAHUB_API_KEY production`.

### Cold start lent

Le Node runtime a un cold start de ~200-500 ms. Le cache CDN (`s-maxage=300`) absorbe ça à partir de la 2e requête sur le même endpoint.

### Erreur 502 sur certains endpoints

Le DataHub est lent / down. La function renvoie 502 ; le client retry (Étape 1) ou affiche "erreur" dans la légende. Vérifier la santé du DataHub avec :

```bash
npm run audit:apis
```
