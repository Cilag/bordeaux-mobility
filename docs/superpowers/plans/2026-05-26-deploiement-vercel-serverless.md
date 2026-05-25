# Déploiement Vercel + Serverless Proxy DataHub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer le dashboard sur Vercel avec une serverless function qui cache la clé DataHub côté serveur, en supprimant le dead code et les credentials Opensky en clair au passage.

**Architecture:** Aucun changement côté React. Le client appelle `/api/datahub/...` (URL inchangée dev/prod). Vite proxy ajoute la clé en dev ; en prod, une function Node Vercel à `api/datahub/[...path].js` ajoute la clé depuis `process.env.DATAHUB_API_KEY` et forward vers `data.bordeaux-metropole.fr` avec cache CDN 5 min.

**Tech Stack:** React 19 + Vite 8 + Vitest + Vercel (function Node runtime, pas Edge — un endpoint dépasse 4 MB).

**Spec :** [docs/superpowers/specs/2026-05-26-deploiement-vercel-serverless-design.md](../specs/2026-05-26-deploiement-vercel-serverless-design.md)

---

## File Structure

**Nouveaux fichiers :**
- `api/datahub/[...path].js` — function Vercel Node, ajoute la clé et forward.
- `vercel.json` — headers de sécurité + SPA fallback.
- `docs/DEPLOYMENT.md` — procédure de déploiement pas-à-pas.

**Fichiers modifiés :**
- `src/datasets/loadDataset.js` — retire `?key=…` de l'URL et l'import de la clé.
- `vite.config.js` — proxy `/api/datahub` ajoute la clé via `loadEnv` + supprime `/api/opensky` et `/api/sncf`.
- `src/__tests__/datasets/loadDataset.test.js` — assertion d'URL ajustée.
- `.env.example` — supprime les clés inutilisées.

**Fichiers supprimés (dead code) :**
- `src/live/LivePage.jsx` (et dossier `src/live/`)
- `src/services/api.js` + `src/__tests__/services/api.test.js`
- `src/hooks/useTBM.js`, `useVCub.js`, `useSNCF.js`, `useOpenSky.js`, `useTrafficLights.js`, `useGeolocation.js`
- `src/__tests__/hooks/useTBM.test.js`, `useVCub.test.js`, `useSNCF.test.js`, `useOpenSky.test.js`
- `src/components/Map/MapView.jsx`, `LayerToggle.{jsx,css}`, et tout `src/components/Map/layers/*` (8 fichiers)
- `src/components/Sidebar/Sidebar.{jsx,css}`, `FlightPanel.jsx`, `SNCFPanel.jsx`, `TramBusPanel.jsx`, `VCubPanel.jsx`
- `src/components/UI/RefreshTimer.{jsx,css}`
- `src/__tests__/components/Sidebar.test.jsx`, `LayerToggle.test.jsx`, `RefreshTimer.test.jsx`

**À NE PAS supprimer :**
- `src/shared/BaseMap.jsx` — utilisé par `DashboardMap.jsx`.
- Tout le reste de `src/dashboard/`, `src/datasets/`, `src/__tests__/datasets/`, `src/__tests__/dashboard/`.

---

## Task 1 : Supprimer le dead code

**Files:** suppressions uniquement (cf. liste détaillée ci-dessous).

L'ordre choisi (supprimer avant de modifier) garantit que les modifications ultérieures ne sont pas pollués par des imports vers du code mort.

- [ ] **Step 1 : Confirmer qu'aucun fichier vivant n'importe les morts**

Run depuis la racine :

```bash
git grep -l "from '\.\./live/\|from '\./components/Map/\|from '\.\./components/Map/\|from '\.\./components/Sidebar/\|from '\.\./components/UI/RefreshTimer\|from '\.\./services/api\|from '\.\./hooks/useTBM\|from '\.\./hooks/useVCub\|from '\.\./hooks/useSNCF\|from '\.\./hooks/useOpenSky\|from '\.\./hooks/useTrafficLights\|from '\.\./hooks/useGeolocation"
```

Expected: aucune ligne en dehors des fichiers qu'on s'apprête à supprimer eux-mêmes (les morts s'importent entre eux, c'est attendu).

Si une ligne pointe vers `src/dashboard/`, `src/datasets/`, `src/shared/`, ou `src/App.jsx` — STOP et reporter NEEDS_CONTEXT. Ne pas supprimer.

- [ ] **Step 2 : Supprimer les fichiers en une passe**

Sur PowerShell :

```powershell
Remove-Item -Recurse -Force src/live
Remove-Item -Recurse -Force src/services
Remove-Item -Recurse -Force src/components/Map
Remove-Item -Recurse -Force src/components/Sidebar
Remove-Item -Recurse -Force src/components/UI
Remove-Item -Recurse -Force src/hooks/useTBM.js, src/hooks/useVCub.js, src/hooks/useSNCF.js, src/hooks/useOpenSky.js, src/hooks/useTrafficLights.js, src/hooks/useGeolocation.js
Remove-Item -Recurse -Force src/__tests__/services
Remove-Item -Recurse -Force src/__tests__/components
Remove-Item -Recurse -Force src/__tests__/hooks/useTBM.test.js, src/__tests__/hooks/useVCub.test.js, src/__tests__/hooks/useSNCF.test.js, src/__tests__/hooks/useOpenSky.test.js
```

Vérifier après :

```powershell
Get-ChildItem src/hooks
```

Expected: `src/hooks/` est maintenant vide (ou n'existe plus). Si vide, supprime aussi le dossier :

```powershell
if ((Get-ChildItem src/hooks -Force | Measure-Object).Count -eq 0) { Remove-Item src/hooks }
```

Idem pour `src/__tests__/hooks/` :

```powershell
if ((Get-ChildItem src/__tests__/hooks -Force | Measure-Object).Count -eq 0) { Remove-Item src/__tests__/hooks }
```

- [ ] **Step 3 : Vérifier que le build et les tests survivent**

Run :

```bash
npm run build
```

Expected: build réussit. Si erreur "cannot resolve import" sur un fichier supprimé, c'est qu'un import était caché (Step 1 a manqué quelque chose) — restaurer ce fichier précis via `git checkout HEAD -- <fichier>` et reporter NEEDS_CONTEXT.

Run :

```bash
npx vitest run
```

Expected: tests verts. Le total descend (les 12 tests cassés de `services/api.test.js` ont disparu). Aucune nouvelle erreur ne doit apparaître.

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "chore: supprime dead code — LivePage, services/api, hooks et components morts"
```

---

## Task 2 : Retirer la clé de l'URL côté client

**Files:**
- Modify: `src/datasets/loadDataset.js`
- Modify: `src/__tests__/datasets/loadDataset.test.js`

- [ ] **Step 1 : Ajuster le test d'URL**

Edit `src/__tests__/datasets/loadDataset.test.js`. Trouver le test `'builds the DataHub GeoJSON url from the datahubId'` (autour des lignes 44-48 du fichier actuel) :

```js
  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    const fetchImpl = fakeFetch({ features: [] })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/datahub/geojson/features/SV_ARRET_P')
  })
```

Remplacer le `expect` par une vérification d'URL exacte (sans `?key=`) :

```js
  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    const fetchImpl = fakeFetch({ features: [] })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/datahub/geojson/features/SV_ARRET_P')
  })
```

- [ ] **Step 2 : Run le test pour vérifier qu'il échoue**

Run :

```bash
npx vitest run src/__tests__/datasets/loadDataset.test.js
```

Expected: le test `'builds the DataHub GeoJSON url from the datahubId'` échoue avec un message du genre `expected '/api/datahub/geojson/features/SV_ARRET_P?key=...' to be '/api/datahub/geojson/features/SV_ARRET_P'`. Les 6 autres tests du fichier passent.

- [ ] **Step 3 : Modifier `loadDataset.js`**

Replace the entire content of `src/datasets/loadDataset.js` :

```js
import { fetchWithRetry } from './fetchWithRetry'

const cache = new Map()

function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}`
  }
  if (source.type === 'opendatasoft') {
    return `/api/opendata/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

// Charge un jeu de données et met le résultat en cache mémoire (clé = entry.id).
// fetchImpl est injectable pour les tests.
// Renvoie { features, degraded } — degraded = true si la 1re tentative a échoué
// mais qu'un retry a sauvé l'appel.
// La clé DataHub n'est PAS dans l'URL : elle est ajoutée côté serveur
// (Vite dev proxy en local, function Vercel en prod).
export async function loadDataset(entry, { fetchImpl = fetch } = {}) {
  if (cache.has(entry.id)) return cache.get(entry.id)
  const { response, attemptsUsed } = await fetchWithRetry(buildUrl(entry.source), { fetchImpl })
  const geojson = await response.json()
  const result = { features: geojson?.features ?? [], degraded: attemptsUsed > 1 }
  cache.set(entry.id, result)
  return result
}

export function clearDatasetCache() {
  cache.clear()
}
```

Changements :
- Retire la ligne `const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY`
- L'URL ne contient plus `?key=${DATAHUB_KEY}`
- Comment mis à jour pour expliquer où la clé est ajoutée

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run :

```bash
npx vitest run src/__tests__/datasets/loadDataset.test.js
```

Expected: 7 tests verts.

- [ ] **Step 5 : Run TOUS les tests**

Run :

```bash
npx vitest run
```

Expected: tous verts, aucune régression.

- [ ] **Step 6 : Commit**

```bash
git add src/datasets/loadDataset.js src/__tests__/datasets/loadDataset.test.js
git commit -m "feat(loadDataset): l'URL n'embarque plus la clé DataHub (ajoutée côté proxy/serveur)"
```

---

## Task 3 : Adapter `vite.config.js` (proxy ajoute la clé en dev, supprimer proxies morts)

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1 : Remplacer `vite.config.js`**

Replace the entire content of `vite.config.js` :

```js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En dev, le proxy Vite ajoute la clé DataHub depuis VITE_DATAHUB_API_KEY (.env).
// En prod, c'est la function Vercel api/datahub/[...path].js qui le fait
// avec process.env.DATAHUB_API_KEY (jamais exposée au client).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/datahub': {
          target: 'https://data.bordeaux-metropole.fr',
          changeOrigin: true,
          rewrite: (path) => {
            const cleanPath = path.replace(/^\/api\/datahub/, '')
            const key = env.VITE_DATAHUB_API_KEY
            if (!key) return cleanPath
            const separator = cleanPath.includes('?') ? '&' : '?'
            return `${cleanPath}${separator}key=${key}`
          },
        },
        '/api/opendata': {
          target: 'https://opendata.bordeaux-metropole.fr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/opendata/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.js',
    },
  }
})
```

Changements vs. l'ancienne version :
- Wrap dans `defineConfig(({ mode }) => { ... })` pour pouvoir appeler `loadEnv`.
- Le proxy `/api/datahub` `rewrite` ajoute `?key=...` au lieu de juste stripper le préfixe.
- Suppression complète du proxy `/api/opensky` (et de ses credentials Basic Auth en clair).
- Suppression complète du proxy `/api/sncf`.
- Conservation du proxy `/api/opendata` (inoffensif, pas de clé).

- [ ] **Step 2 : Vérifier que le dev server démarre et que les données chargent**

Run en arrière-plan :

```bash
npm run dev
```

Attendre le message `Local: http://localhost:5173/`.

Test manuel :
1. Ouvrir `http://localhost:5173/dashboard/mobilite` (via Preview MCP, Chrome MCP, ou navigateur).
2. Vérifier dans DevTools Network : une requête `/api/datahub/geojson/features/SV_ARRET_P` part, retourne 200 avec du GeoJSON.
3. Vérifier que la légende affiche les jeux comme `chargés` (pas tous en erreur).

Si ça marche :

```bash
# Stop le dev server
```

Si ça ne marche pas (jeux en erreur) : ouvrir DevTools Network, regarder la requête. Si elle part vers `data.bordeaux-metropole.fr` sans `?key=`, c'est que `loadEnv` n'a pas trouvé la clé — vérifier que `.env` contient bien `VITE_DATAHUB_API_KEY=...` et redémarrer le dev server.

- [ ] **Step 3 : Run les tests pour vérifier qu'on n'a rien cassé**

Run :

```bash
npx vitest run
```

Expected: tous verts.

- [ ] **Step 4 : Commit**

```bash
git add vite.config.js
git commit -m "fix(vite): proxy datahub ajoute la clé en dev + supprime proxies opensky/sncf et credentials"
```

---

## Task 4 : Mettre à jour `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1 : Remplacer le contenu**

Replace the entire content of `.env.example` :

```
# Clé d'API du DataHub Bordeaux Métropole.
# - En dev : utilisée par le proxy Vite (vite.config.js) pour ajouter ?key=... aux requêtes DataHub.
# - En prod : ne pas l'utiliser ici ; la clé est configurée dans Vercel sous le nom DATAHUB_API_KEY.
VITE_DATAHUB_API_KEY=
```

Changements : suppression de `VITE_SNCF_API_KEY` et `VITE_TOMTOM_API_KEY` (les services qui les utilisaient sont morts).

- [ ] **Step 2 : Commit**

```bash
git add .env.example
git commit -m "chore: .env.example — ne garde que VITE_DATAHUB_API_KEY"
```

---

## Task 5 : Créer la function Vercel

**Files:**
- Create: `api/datahub/[...path].js`

- [ ] **Step 1 : Créer le dossier `api/datahub/`**

```bash
mkdir -p api/datahub
```

Sur PowerShell :

```powershell
New-Item -ItemType Directory -Force -Path api/datahub | Out-Null
```

- [ ] **Step 2 : Créer la function**

Create `api/datahub/[...path].js` :

```js
// Function Vercel (Node runtime).
// Forward des requêtes /api/datahub/* vers data.bordeaux-metropole.fr
// en ajoutant la clé DATAHUB_API_KEY (env Vercel) côté serveur.
// Cache CDN 5 min : les données changent quotidiennement.
//
// Le runtime Node est nécessaire (pas Edge) car certaines réponses
// dépassent 4 MB (lignes-tbm-tracees ≈ 25 MB).

export default async function handler(req, res) {
  const key = process.env.DATAHUB_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'DATAHUB_API_KEY not configured' })
  }

  // req.url ressemble à "/api/datahub/geojson/features/SV_ARRET_P"
  // on enlève le préfixe pour reconstruire l'URL upstream.
  const subPath = req.url.replace(/^\/api\/datahub/, '')
  const separator = subPath.includes('?') ? '&' : '?'
  const upstream = `https://data.bordeaux-metropole.fr${subPath}${separator}key=${key}`

  try {
    const response = await fetch(upstream)
    const body = await response.text()
    res.status(response.status)
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.send(body)
  } catch (err) {
    res.status(502).json({ error: 'upstream fetch failed', detail: err.message })
  }
}
```

Notes :
- Pas de package.json dans `api/` — Vercel détecte automatiquement les functions ES modules à la racine `api/`.
- Pas de test unitaire : 25 lignes triviales, validation par le déploiement.

- [ ] **Step 3 : Vérifier que le build local fonctionne encore**

Run :

```bash
npm run build
```

Expected: build réussit. Vite ne touche pas au dossier `api/` (Vercel-specific).

- [ ] **Step 4 : Commit**

```bash
git add api/datahub/[...path].js
git commit -m "feat(vercel): function api/datahub/[...path] — proxy DataHub avec clé côté serveur"
```

---

## Task 6 : Créer `vercel.json`

**Files:**
- Create: `vercel.json`

- [ ] **Step 1 : Créer le fichier de config**

Create `vercel.json` à la racine du repo :

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/dashboard/:path*", "destination": "/index.html" }
  ]
}
```

Notes :
- Le rewrite SPA garantit que `/dashboard/mobilite` direct (sans passer par `/`) sert bien `index.html`.
- Pas besoin de rewrite pour `/api/*` : Vercel route automatiquement vers les functions.
- Pas de rewrite pour `/` : c'est `index.html` par défaut.

- [ ] **Step 2 : Vérifier la validité du JSON**

Run :

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"
```

Expected: aucune sortie (pas d'erreur de parsing). Si erreur, fixer le JSON.

- [ ] **Step 3 : Commit**

```bash
git add vercel.json
git commit -m "feat(vercel): vercel.json — security headers + SPA fallback /dashboard"
```

---

## Task 7 : Créer `docs/DEPLOYMENT.md`

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1 : Écrire la procédure de déploiement**

Create `docs/DEPLOYMENT.md` :

````markdown
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
````

- [ ] **Step 2 : Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: DEPLOYMENT.md — procédure Vercel + vérifications + troubleshooting"
```

---

## Task 8 : Vérification finale + push

**Files:** aucun (vérification + push).

- [ ] **Step 1 : Tests verts**

Run :

```bash
npx vitest run
```

Expected: 100 % verts. Note : le total est plus bas qu'au début (les ~50 tests de `services/`, `hooks/`, `components/` ont disparu avec les fichiers).

- [ ] **Step 2 : Build production OK**

Run :

```bash
npm run build
```

Expected: build réussit. La taille du bundle devrait avoir baissé (dead code supprimé).

- [ ] **Step 3 : Lint clean**

Run :

```bash
npm run lint
```

Expected: 0 erreur sur les fichiers `src/`. Warnings tolérés s'ils existaient déjà.

- [ ] **Step 4 : Audit APIs**

Run :

```bash
npm run audit:apis
```

Expected: exit `0` ou `1` selon la santé live du DataHub. Le script est inchangé, doit fonctionner.

- [ ] **Step 5 : Vérification dev complète**

Run :

```bash
npm run dev
```

Ouvrir via Preview MCP ou navigateur :
- `http://localhost:5173/dashboard/mobilite` : tout charge, charts visibles, légende OK.
- `http://localhost:5173/dashboard/stationnement` : idem.

DevTools Network : vérifier que les requêtes `/api/datahub/...` partent SANS `?key=` dans le path du client, mais qu'elles atteignent bien `data.bordeaux-metropole.fr` avec `?key=` ajouté par le proxy (visible dans l'onglet réponse / response URL).

Stop le dev server.

- [ ] **Step 6 : Push vers origin/main**

```bash
git push origin main
```

Expected: Vercel ne sera pas notifié tant que l'utilisateur n'a pas suivi `docs/DEPLOYMENT.md`. Ce push existe pour que GitHub ait l'état complet, prêt pour le déploiement manuel.

- [ ] **Step 7 : Récap final**

Écrire un message court récapitulant :
- Tests : combien verts, combien de fichiers de test supprimés.
- Build : taille bundle avant/après si tu peux la mesurer (optionnel).
- Audit APIs : compte OK/FAIL/EMPTY.
- Liste des commits ajoutés à cette étape.
- Prochaine action concrète pour l'utilisateur : suivre `docs/DEPLOYMENT.md` pour activer Vercel.
- Pointer vers l'Étape 3 (TanStack Query) comme prochain cycle brainstorm.

---

## Self-review du plan

**Couverture du spec :**
- Objectif 1 (URL publique `<projet>.vercel.app`) → couvert par Tasks 5, 6, 7 (création function + config + procédure utilisateur).
- Objectif 2 (clé invisible côté client) → Tasks 2 (retire de l'URL), 3 (proxy dev ajoute), 5 (function prod ajoute).
- Objectif 3 (auto-deploy sur push) → Task 7 (procédure DEPLOYMENT.md inclut l'activation), Task 8 (push final).
- Objectif 4 (`npm run dev` continue de marcher) → Task 3 + Task 8 Step 5 (vérif visuelle).
- Objectif 5 (suppression dead code + credentials Opensky) → Task 1 (suppression fichiers), Task 3 (vite.config sans opensky/sncf), Task 4 (.env.example).
- Objectif 6 (DEPLOYMENT.md) → Task 7.
- Architecture, composants, flux → mappés tâche-à-tâche.
- Critères d'acceptation → vérifiés via Task 8.

Aucun gap identifié.

**Placeholders :** aucun "TBD" / "implémenter plus tard" / "etc." dans les steps. Le seul élément non-automatisable est la procédure Vercel utilisateur — qui est documentée intégralement dans `DEPLOYMENT.md`, pas en tant que TODO.

**Cohérence des types :** la signature `{ features, degraded }` de `loadDataset` est inchangée (Task 2 ne touche que `buildUrl`, pas le retour). Le proxy dev (`vite.config.js`) et la function prod (`api/datahub/[...path].js`) construisent l'URL upstream de manière identique (mêmes regex de strip + même logique `?` vs `&`). Cohérent.

**Risques d'exécution :**
- Task 1 (suppression) doit absolument venir en premier, sinon les modifications de Tasks 2-3 sont polluées par des imports morts.
- Task 3 (vite.config) modifie le `defineConfig` en fonction-callback ; tester en dev (Step 2) est crucial pour confirmer que `loadEnv` charge bien la clé.
- Task 5 (function Vercel) ne peut pas être testée localement — la vérification ne vient qu'au déploiement (par l'utilisateur via DEPLOYMENT.md).
