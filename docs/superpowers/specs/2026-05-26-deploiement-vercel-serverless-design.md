# Spec — Déploiement Vercel avec proxy serverless DataHub

**Date** : 2026-05-26
**Étape** : 2/3 du découpage (cf. Étape 1 : [docs/superpowers/specs/2026-05-25-charts-vides-et-audit-apis-design.md](2026-05-25-charts-vides-et-audit-apis-design.md)). Cette étape ne couvre **pas** TanStack Query (Étape 3).

## Contexte

L'app `bordeaux-mobility` (React 19 + Vite 8) tourne uniquement en local. La clé DataHub Bordeaux Métropole (`VITE_DATAHUB_API_KEY`) est embarquée dans le bundle JS, ce qui interdit un déploiement public en l'état : la clé serait visible dans les requêtes du navigateur et exploitable par n'importe qui.

L'utilisateur veut une URL publique stable pour partager le dashboard, sans exposer la clé. Le déploiement doit aussi survivre aux mises à jour : `git push origin main` → nouveau déploiement automatique.

Audit du repo en début de spec :
- `vite.config.js` proxifie aussi `/api/opensky` (avec des credentials Basic Auth en clair `apu974-api-client:0pScEX4YUfBecMd4HXeM3OU8vvMt9vJI`) et `/api/sncf`. Aucun de ces proxies n'est utilisé en prod : `App.jsx` ne route que `/dashboard/:domaine`, plus rien d'autre.
- `src/live/LivePage.jsx`, `src/services/api.js`, plusieurs hooks (`useTBM`, `useVCub`, `useSNCF`, `useOpenSky`, `useTrafficLights`, `useGeolocation`) et toute l'arborescence `src/components/Map/`, `src/components/Sidebar/` sont du **dead code** : aucune route ne les invoque depuis le retrait de `/live` dans `App.jsx`.
- 12 tests dans `src/__tests__/services/api.test.js` échouent depuis longtemps — c'est du dead test sur du dead code.

Cette étape règle les trois choses d'un coup : 1) déploiement Vercel propre avec proxy serverless, 2) clé exclusivement côté serveur, 3) suppression du dead code (réduit la surface d'attaque et fait disparaître les 12 tests cassés).

## Objectifs

1. URL publique `https://<projet>.vercel.app` qui sert le dashboard avec des données DataHub fraîches.
2. Clé `DATAHUB_API_KEY` invisible côté client (uniquement en variable d'environnement Vercel).
3. Déploiement automatique à chaque `git push origin main`.
4. `npm run dev` continue de marcher localement avec le même contrat d'URL.
5. Suppression de tout le dead code (LivePage et son écosystème) et des credentials Opensky en clair.
6. Documentation de la procédure Vercel (`docs/DEPLOYMENT.md`) que l'utilisateur exécute lui-même.

## Non-objectifs

- TanStack Query, cache localStorage, AbortController → **Étape 3**.
- Domaine personnalisé (mobility.bordeaux-metropole.fr ou autre) — le sous-domaine vercel.app suffit.
- Monitoring, alerting, métriques au-delà des logs Vercel par défaut.
- Tests d'intégration sur la function Vercel (validation manuelle via le déploiement).
- Refonte de l'UI ou des charts.

## Décomposition globale (rappel)

1. ✅ Étape 1 : Fix charts vides + audit/retry APIs
2. **(ce spec)** Étape 2 : Déploiement Vercel + serverless proxy
3. Étape 3 : TanStack Query (cache, revalidation, retry centralisés)

## Architecture

Pas de changement d'architecture côté React. Le client appelle `/api/datahub/geojson/features/<ID>` indépendamment de l'environnement. L'intermédiaire change :

- **Dev** : Vite dev proxy (déjà existant) `rewrite` l'URL pour ajouter `?key=…` avec la clé du `.env` local.
- **Prod** : Vercel Edge Network sert le statique de `dist/` ; les requêtes `/api/datahub/*` sont routées vers une function Node `api/datahub/[...path].js` qui ajoute la clé depuis `process.env.DATAHUB_API_KEY` et forward vers `data.bordeaux-metropole.fr`. La réponse est mise en cache CDN 5 minutes (`s-maxage=300, stale-while-revalidate=60`) — la donnée DataHub change quotidiennement, donc 5 min de cache est invisible pour l'utilisateur.

La function utilise le **Node runtime** (pas Edge) parce qu'au moins un endpoint (`lignes-tbm-tracees`, 25 MB) dépasse les limites de body Edge.

## Composants

| Fichier | Statut | Rôle |
|---|---|---|
| `api/datahub/[...path].js` | **nouveau** | Function Vercel Node. Reçoit `req`, ajoute la clé via `process.env.DATAHUB_API_KEY`, forward vers DataHub, renvoie la réponse avec `Cache-Control` CDN. ~25 lignes. |
| `vercel.json` | **nouveau** | Headers de sécurité globaux (`X-Content-Type-Options`, `X-Frame-Options`) et règle pour servir les routes React (SPA fallback vers `index.html`). |
| `docs/DEPLOYMENT.md` | **nouveau** | Procédure pas-à-pas : install Vercel CLI → `vercel link` → `vercel env add DATAHUB_API_KEY production` → `vercel --prod` → vérifications. |
| `src/datasets/loadDataset.js` | modifié | Retire `?key=${DATAHUB_KEY}` de l'URL ; retire l'import/lecture de `import.meta.env.VITE_DATAHUB_API_KEY`. |
| `vite.config.js` | modifié | Le proxy `/api/datahub` ajoute la clé via `rewrite` (lit `process.env.VITE_DATAHUB_API_KEY` chargé par dotenv au démarrage). Supprime les proxies `/api/opensky` et `/api/sncf` (et leurs credentials en clair). Garde `/api/opendata` au cas où (non utilisé activement mais pas dangereux). |
| `.env.example` | modifié | Ne garde que `VITE_DATAHUB_API_KEY=`. |
| `src/__tests__/datasets/loadDataset.test.js` | modifié | L'assertion sur l'URL ne vérifie plus la présence de `?key=...`. |
| `scripts/audit-datahub.mjs` | inchangé | Continue d'appeler DataHub directement avec la clé du `.env` — hors scope du proxy. |

**Fichiers supprimés (dead code) :**

- `src/live/LivePage.jsx`
- `src/services/api.js` et son test `src/__tests__/services/api.test.js` (les 12 tests cassés disparaissent)
- `src/hooks/useTBM.js`, `useVCub.js`, `useSNCF.js`, `useOpenSky.js`, `useTrafficLights.js`, `useGeolocation.js`
- Tests `src/__tests__/hooks/useTBM.test.js`, `useVCub.test.js`, `useSNCF.test.js`, `useOpenSky.test.js`
- `src/components/Map/` (sauf rien — tout est dead : `MapView.jsx`, `LayerToggle.jsx`, `layers/*`)
- `src/components/Sidebar/` (tout : `Sidebar.jsx`, panels)
- `src/components/UI/RefreshTimer.jsx` (utilisé par Sidebar uniquement)
- `src/__tests__/components/Sidebar.test.jsx`, `LayerToggle.test.jsx`, `RefreshTimer.test.jsx`

**À garder explicitement :**

- `src/shared/BaseMap.jsx` (utilisé par `DashboardMap.jsx`)
- Tout le reste de `src/dashboard/`, `src/datasets/`, `src/__tests__/datasets/`, `src/__tests__/dashboard/`

## Flux de données

**Dev** :
```
client GET /api/datahub/geojson/features/SV_ARRET_P
  → Vite proxy: rewrite ajoute ?key=<dev_key>
  → GET https://data.bordeaux-metropole.fr/geojson/features/SV_ARRET_P?key=<dev_key>
  → 200 GeoJSON → client
```

**Prod** :
```
client GET /api/datahub/geojson/features/SV_ARRET_P
  → Vercel CDN: cache hit? renvoie immédiat
  → sinon: invoke api/datahub/[...path].js
  → function: ajoute ?key=<prod_key> depuis process.env
  → GET https://data.bordeaux-metropole.fr/...
  → renvoie au client + Cache-Control: s-maxage=300, stale-while-revalidate=60
  → CDN cache 5 min
```

`fetchWithRetry` (Étape 1) fonctionne sans changement : il voit la même URL `/api/datahub/...` et retry sur 5xx.

## Code clef de la function

```js
// api/datahub/[...path].js
export default async function handler(req, res) {
  const key = process.env.DATAHUB_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'DATAHUB_API_KEY not configured' })
  }
  const path = req.url.replace(/^\/api\/datahub/, '')
  const separator = path.includes('?') ? '&' : '?'
  const upstream = `https://data.bordeaux-metropole.fr${path}${separator}key=${key}`
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

## `vercel.json`

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
    { "source": "/dashboard/:path*", "destination": "/index.html" },
    { "source": "/", "destination": "/index.html" }
  ]
}
```

Les rewrites SPA assurent que le routing React fonctionne quand l'utilisateur arrive directement sur `/dashboard/mobilite` (sans le rewrite, Vercel renverrait 404 car le fichier n'existe pas).

## Procédure de déploiement (résumé du `DEPLOYMENT.md`)

1. Installer Vercel CLI : `npm i -g vercel` (une fois).
2. Dans le repo : `vercel link` — choisir le scope, créer un nouveau projet `bordeaux-mobility`.
3. `vercel env add DATAHUB_API_KEY production` — coller la clé (Vercel la stocke chiffrée, ne la log jamais).
4. `vercel env add DATAHUB_API_KEY preview` — pour les déploiements de PR si un jour il y en a.
5. Connecter le repo GitHub `Cilag/bordeaux-mobility` dans le dashboard Vercel → activer auto-deploy sur `main`.
6. Premier déploiement : `vercel --prod` ou push sur `main`.
7. Vérifications : la function `api/datahub/[...path].js` répond, le bundle JS ne contient plus la clé (chercher dans DevTools Network).

## Gestion d'erreurs

- **Clé manquante en prod** : function renvoie 500. Le client retry une fois (Étape 1), puis affiche "erreur" dans la légende. Diagnostic = config Vercel cassée → re-runner `vercel env add`.
- **Upstream DataHub 5xx** : function renvoie le status tel quel. Le client retry, puis badge "dégradé" ou "erreur".
- **Upstream timeout** (>10s, limite Vercel hobby) : function lève, renvoie 502. Client retry une fois.
- **Cache CDN sert une réponse périmée** : `stale-while-revalidate=60` autorise le CDN à servir l'ancienne réponse pendant 60s tout en relançant la requête en arrière-plan. Acceptable car les données changent quotidiennement.

## Sécurité

- `DATAHUB_API_KEY` uniquement en env Vercel — jamais en clair dans le repo.
- Suppression des credentials Opensky en clair (`vite.config.js`) — fin du risque historique.
- Headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` sur toutes les réponses (config `vercel.json`).
- La function ne log jamais la clé.
- La clé reste lisible dans le `.env` local (dev) — c'est attendu et `.env` est dans `.gitignore`.

## Tests

- `src/__tests__/datasets/loadDataset.test.js` : ajuster le test `'builds the DataHub GeoJSON url from the datahubId'` pour vérifier `expect(url).toBe('/api/datahub/geojson/features/SV_ARRET_P')` (sans `?key=`).
- Les autres tests `loadDataset` continuent de passer car ils utilisent un `fetchImpl` mocké, indépendant de l'URL exacte.
- Les 12 tests cassés de `services/api.test.js` disparaissent (fichier supprimé). Baseline finale attendue : ~190 tests verts, 0 cassés.
- Pas de test pour la function Vercel : c'est ~25 lignes d'intégration, validé manuellement via le déploiement et le smoke `npm run audit:apis`.

## Critères d'acceptation

- [ ] `https://<projet>.vercel.app/dashboard/mobilite` charge et affiche tous les jeux DataHub avec leurs features.
- [ ] DevTools Network : aucune requête sortante ne contient `?key=` ; aucune clé dans le bundle JS livré (`view-source` ou recherche dans les chunks `dist/`).
- [ ] Push d'un commit trivial sur `main` déclenche un nouveau déploiement Vercel sans intervention.
- [ ] `npm run dev` fonctionne comme avant.
- [ ] `npx vitest run` → tous verts, 0 cassés (les 12 ex-cassés ont disparu avec leur fichier).
- [ ] `npm run audit:apis` continue de fonctionner (il appelle DataHub direct, hors scope du proxy).
- [ ] `docs/DEPLOYMENT.md` permet de refaire l'opération en 10 min.
- [ ] Headers de sécurité présents en prod (`curl -I https://<projet>.vercel.app/`).

## Risques et trade-offs

- **Trade-off cache 5 min** : un utilisateur peut voir des données vieilles de 5 min. Pour des données qui se mettent à jour quotidiennement, c'est invisible. Si un cas urgent apparaît (ex: événement de circulation temps réel), réduire à `s-maxage=60`.
- **Trade-off Node runtime vs Edge** : ~200 ms de cold start en plus, mais on supporte les payloads >4 MB. Cache CDN annule ce cost sur la 2e visite.
- **Risque limite Vercel Hobby** : timeout function = 10 s. DataHub répond en <2 s en moyenne, mais les gros endpoints (25 MB) prennent ~1.3 s d'après l'audit. Acceptable. Si on dépasse, passer Pro (20 $/mois) ou réduire la taille (cap features).
- **Risque suppression dead code** : si quelque chose qu'on pensait mort est en fait utilisé indirectement, ça casse. Mitigation : `npm run build` + tests + smoke visuel après suppression.
- **Pas de test automatisé de la function** : un changement futur dans la function pourrait casser sans qu'on le voie. Acceptable parce que le code est très simple et le déploiement échouera bruyamment si l'URL ne répond pas. Étape 3 réintroduira potentiellement TanStack Query qui couvrira la fiabilité côté client.
