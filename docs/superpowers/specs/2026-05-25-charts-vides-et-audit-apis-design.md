# Spec — Fix charts vides + audit & retry des APIs DataHub

**Date** : 2026-05-25
**Étape** : 1/3 d'un découpage plus large (cf. § Contexte). Cette étape ne couvre **pas** le déploiement Vercel ni l'intégration TanStack Query.

## Contexte

Le dashboard `bordeaux-mobility` agrège 31 jeux GeoJSON du DataHub Bordeaux Métropole (+ 1 Opendatasoft). Layout actuel : deux rangées, `[Filtres | Carte]` en haut, `[KPIs + ChartGrid]` en bas.

L'utilisateur final ne voit **rien** sous la carte : la zone des graphiques apparaît vide à l'écran, alors que le composant `<ChartGrid>` est bien rendu dans le JSX ([src/dashboard/DashboardPage.jsx:424](../../../src/dashboard/DashboardPage.jsx)). Le commit `50278f6 fix(layout): page scrolle au lieu de section interne` a corrigé une partie du problème, mais le symptôme persiste.

En parallèle, on n'a aucune visibilité sur la santé des 31 endpoints DataHub : un jeu en erreur silencieuse passe inaperçu jusqu'à ce qu'un utilisateur s'en plaigne. Et `loadDataset` ne retente pas en cas d'erreur transitoire (5xx, micro-coupure réseau).

Cette étape rend le dashboard fonctionnel pour l'utilisateur final, donne un outil d'audit, et ajoute un filet de sécurité runtime — sans introduire de dépendances lourdes (refactor TanStack Query reporté à l'étape 3).

## Découpage global (rappel)

1. **(ce spec)** Fix charts vides + audit/retry APIs
2. Déploiement Vercel + serverless functions pour proxifier DataHub
3. TanStack Query : cache, revalidation, retry centralisés

Chaque étape aura son propre cycle brainstorm → spec → plan → impl.

## Objectifs

1. Les graphiques s'affichent correctement sous la carte sur toutes les routes dashboard, en desktop comme en plus petit écran.
2. Un script `npm run audit:apis` audite les 31 endpoints DataHub et rapporte ceux en erreur, avec exit code adapté.
3. `loadDataset` retry automatiquement 2 fois sur erreur transitoire ; la légende affiche un badge orange "dégradé" quand un jeu a été récupéré au retry.

## Non-objectifs

- Refactor du chargement des données (TanStack Query / SWR).
- Cache localStorage / IndexedDB.
- Déploiement Vercel ou serverless proxy.
- Refonte visuelle des graphes (couleurs, type de viz).
- Monitoring continu / cron / endpoint `/api/health` (les questions de clarification ont écarté ces options).

## Investigation préalable (avant tout code de fix)

On suit `systematic-debugging`. Avant d'écrire la moindre règle CSS, confirmer la cause racine.

1. Lancer `npm run dev`.
2. Ouvrir `/dashboard/mobilite` via le MCP Claude Preview ou Chrome.
3. Screenshot pleine page + inspect du DOM : où est `.dashboard-bottom` dans le viewport ? Quelle hauteur a `.dashboard-top` ? Y a-t-il un parent avec `overflow: hidden` ou `height: 100vh` qui mange la zone bas ?
4. Vérifier la console (erreurs React/CSP/fetch) et la palette `<body>` / `#root`.
5. Documenter la cause racine dans le plan d'implémentation avant de produire le fix.

Hypothèses ordonnées par probabilité :

- **H1** — `src/index.css:58` contraint `#root { width: 1126px; text-align: center; border-inline: 1px solid var(--border); min-height: 100svh }`. C'est un héritage du template Vite ; le dashboard est conçu pleine largeur. Cette contrainte peut casser la grid sur grand écran et masquer la zone bas (le `min-height: 100svh` flexible empêche peut-être le scroll natural).
- **H2** — `.dashboard-top` a `grid-template-rows: calc(100vh - 160px)` ([dashboard.css:106](../../../src/dashboard/dashboard.css)) : la rangée du haut remplit l'écran initial, et `.dashboard-bottom` est sous le fold. Si le scroll page est cassé (overflow parent), la zone est invisible.
- **H3** — `activeLayers` vide pour une raison de filtrage par défaut, donc tous les charts sont en `status: 'vide'` et la grid n'affiche que des messages "Aucune donnée pour cette zone/période".

Le fix s'adaptera à la cause confirmée. Le plan d'implémentation produit après brainstorming devra référencer H1/H2/H3 résolus.

## Architecture

Aucun changement de structure. Modifications localisées :

```
DashboardPage  →  useDatasets(entries)  →  loadDataset(entry)  →  fetchWithRetry  →  fetch
                       ↓                          ↓
                  state.degraded               { features, degraded }
                       ↓
                 LayerLegend  →  badge "dégradé"
```

Nouveau composant utilitaire `fetchWithRetry` extrait de `loadDataset` pour être testable isolément et réutilisable par l'étape 3.

## Composants

| Fichier | Statut | Rôle |
|---|---|---|
| `src/datasets/fetchWithRetry.js` | nouveau | `fetchWithRetry(url, { attempts=2, backoffMs=500, fetchImpl=fetch })` → `{ response, attemptsUsed }`. Retry sur erreur réseau et 5xx ; pas sur 4xx. |
| `src/datasets/loadDataset.js` | modifié | Utilise `fetchWithRetry`. Renvoie `{ features, degraded }` (degraded = retry a sauvé). Cache mémoire conservé. |
| `src/dashboard/useDatasets.js` | modifié | Propage `degraded` dans l'état par jeu : `{ status, dataset, error, degraded }`. |
| `src/dashboard/LayerLegend.jsx` | modifié | Pastille orange + `title="Récupéré après retry"` quand `degraded`. |
| `src/index.css` | modifié | Override des contraintes héritées du template pour les routes `/dashboard/*` et `/live` (cf. § Stratégie CSS). |
| `src/dashboard/dashboard.css` | modifié si besoin | Selon investigation : garantir overflow et hauteur naturelle de `.dashboard-bottom`. |
| `src/dashboard/DashboardPage.jsx` | modifié | `useEffect` qui ajoute/retire `document.body.classList.add('fullscreen')` à la monte/démonte (si stratégie classe-sur-body retenue). |
| `src/live/LivePage.jsx` | modifié | Idem pour cohérence. |
| `scripts/audit-datahub.mjs` | nouveau | Script Node : audit séquentiel des 31 endpoints, output tableau, exit code. |
| `package.json` | modifié | `"audit:apis": "node scripts/audit-datahub.mjs"`. |
| `__tests__/datasets/fetchWithRetry.test.js` | nouveau | Tests unitaires du wrapper. |
| `__tests__/datasets/loadDataset.test.js` | modifié | Vérifie `degraded`. |
| `__tests__/dashboard/useDatasets.test.js` | modifié | Vérifie propagation `degraded`. |

## Stratégie CSS du fix layout

Si l'investigation confirme H1 (contrainte `#root`), approche retenue :

- Ajouter une classe `fullscreen` sur `document.body` quand le dashboard ou la page live sont montés.
- Dans `src/index.css`, ajouter une règle `body.fullscreen #root { width: 100%; max-width: 100%; text-align: left; border-inline: none; }`.
- `useEffect` dans `DashboardPage` et `LivePage` :
  ```js
  useEffect(() => {
    document.body.classList.add('fullscreen')
    return () => document.body.classList.remove('fullscreen')
  }, [])
  ```

Si H2 (scroll bas du fold) est aussi en cause, ajouter un séparateur visuel doux entre `.dashboard-top` et `.dashboard-bottom` (ombre ou trait) pour signifier qu'il y a du contenu plus bas, et vérifier que ni `<html>`, ni `<body>`, ni `#root` n'ont `overflow: hidden`.

Si H3 (données vides) seule s'avère exacte, le fix est différent (revoir les filtres par défaut) ; le plan adaptera.

## Smoke test — comportement attendu

```
$ npm run audit:apis
DataHub audit · 2026-05-25T14:32:11Z

[ 1/31] arrets-tbm                  OK    142 ms  3421 features   41.2 KB
[ 2/31] carrefours-feux             OK     89 ms  1056 features   12.8 KB
[ 3/31] vcub-stations               FAIL   HTTP 503 (after 2 retries)
[ 4/31] capteurs-pieton             OK    211 ms     0 features    0.4 KB  ⚠ empty
...
─────────────────────────────────────
29/31 OK · 1 FAIL · 1 EMPTY · 4.8 s total
Exit code: 1
```

- Lecture des entries depuis `src/datasets/registry.js` (import direct ESM, pas de duplication).
- Clé API lue depuis `.env.local` : parsing maison minimal (5 lignes, pas de dépendance).
- Délai 200 ms entre requêtes (rate-limit côté DataHub).
- Sortie colorée via `process.stdout` + codes ANSI bruts (pas de `chalk`).
- Exit code : `0` si tout OK, `1` si au moins un FAIL, `0` même avec des EMPTY (informatif).
- Lancé manuellement avant un déploiement ; pas dans la CI à ce stade.

## Comportement retry

`fetchWithRetry` :
- Tente jusqu'à `attempts` fois (par défaut 2 — donc 1 retry).
- Retry sur : exception de `fetch` (erreur réseau), `response.status >= 500`.
- Pas de retry sur : `response.status` entre 400 et 499 (problème permanent : mauvais ID, droits, etc.).
- Backoff : `backoffMs` × (n° tentative). Premier retry à 500 ms, deuxième à 1000 ms.
- Renvoie `{ response, attemptsUsed }` : `attemptsUsed > 1` ⇒ `degraded: true` côté `loadDataset`.

Badge "dégradé" : pastille orange `#E69A2B` à côté du libellé dans `LayerLegend`, avec `title` HTML pour le tooltip. Pas de notification globale (non-bloquant).

## Tests (TDD)

`fetchWithRetry.test.js` (nouveau) :
- ✔ Renvoie la réponse au 1er essai si `ok`.
- ✔ Retry sur 503 puis succès → `attemptsUsed === 2`.
- ✔ Pas de retry sur 404 → échoue immédiatement.
- ✔ Retry sur exception `fetch` puis succès.
- ✔ Échec après toutes les tentatives → lève la dernière erreur.
- ✔ Backoff respecté (mock du timer).

`loadDataset.test.js` (modifié) :
- ✔ `degraded: false` au premier essai réussi.
- ✔ `degraded: true` quand la retry a sauvé.
- ✔ Cache mémoire fonctionne toujours.

`useDatasets.test.js` (modifié) :
- ✔ Propage `degraded` dans l'état.

`LayerLegend.test.jsx` (modifié si existe) :
- ✔ Affiche la pastille orange quand `degraded`.

## Critères d'acceptation

- [ ] L'utilisateur voit les graphiques sous la carte sans manipulation particulière sur `/dashboard/mobilite` et `/dashboard/stationnement`.
- [ ] `npm run audit:apis` produit la sortie décrite et exit code conforme.
- [ ] Quand on simule une erreur 503 transitoire sur un jeu, la légende montre la pastille orange "dégradé" et le jeu est bien chargé.
- [ ] Tous les tests existants passent + nouveaux tests verts.
- [ ] Aucune nouvelle dépendance npm.

## Risques et trade-offs

- **Risque DataHub down pendant l'audit** : le script peut échouer non par notre faute. Mitigation : exit code `1` mais sortie claire qui distingue 503 (DataHub down) vs 404 (notre ID est faux).
- **Trade-off retry** : ajoute jusqu'à 1.5 s de latence sur un jeu en erreur transitoire. Acceptable car le rendu est asynchrone par jeu (les autres ne sont pas bloqués).
- **Cache mémoire conservé tel quel** : sera remplacé à l'étape 3 par TanStack Query. Pas la peine d'investir maintenant.
- **Pas d'AbortController** : si l'utilisateur change de domaine pendant un chargement, des requêtes obsolètes finiront leur cycle (déjà le cas aujourd'hui). À traiter étape 3.
