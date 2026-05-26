# Spec — TanStack Query (cache, retry, refetch centralisés)

**Date** : 2026-05-26
**Étape** : 3/3 du découpage. Étapes précédentes :
- Étape 1 : [docs/superpowers/specs/2026-05-25-charts-vides-et-audit-apis-design.md](2026-05-25-charts-vides-et-audit-apis-design.md)
- Étape 2 : [docs/superpowers/specs/2026-05-26-deploiement-vercel-serverless-design.md](2026-05-26-deploiement-vercel-serverless-design.md)

## Contexte

Le chargement des datasets utilise actuellement un patchwork maison :
- `loadDataset.js` : cache mémoire via `Map`, retry via `fetchWithRetry`, retourne `{features, degraded}`.
- `useDatasets.js` : `useEffect` + `setState` qui charge N entries en parallèle, propage `degraded`.
- `useContours.js` : autre `useEffect` qui charge les contours administratifs.
- `DashboardPage.jsx` : 3e `useEffect` qui charge `carrefours-feux` manuellement.

Ce code marche mais a 3 limites :
1. **Pas d'AbortController** — quand l'utilisateur navigue entre `/dashboard/mobilite` et `/dashboard/stationnement` pendant un chargement, les requêtes en cours finissent quand même.
2. **Pas de refetch automatique** — si l'utilisateur laisse l'onglet ouvert 2h, les données restent celles du premier chargement.
3. **3 patterns différents** pour fetch + cache + retry → maintenance fastidieuse, comportements légèrement divergents (ex : `useContours` n'a pas de gestion d'erreur visible).

TanStack Query centralise tout ça avec une API déclarative standard de l'écosystème React.

## Objectifs

1. **Chargement centralisé** : un seul `queryClient` configure retry, refetch et cache pour tous les datasets.
2. **Refetch silencieux** quand l'utilisateur revient sur l'onglet (après 30 min de stale).
3. **AbortController automatique** géré par TanStack Query sur démontage/changement de query.
4. **DevTools** en dev pour inspecter le cache, voir quelles queries sont fraîches/staled/refetching.
5. **Suppression de `fetchWithRetry.js`** (retry intégré au queryClient).
6. **Préservation du comportement existant** : même contrat de retour pour `useDatasets`, même badge "dégradé" dans la légende, mêmes états UI.

## Non-objectifs

- Persistance localStorage / IndexedDB (datasets jusqu'à 25 MB → ne tient pas dans localStorage, IndexedDB serait possible mais YAGNI pour cette étape).
- Migration de `scripts/audit-datahub.mjs` (script Node CLI indépendant, sans React).
- Mutations / optimistic updates (l'app est read-only).
- Suspense ou `useSuspenseQuery` (le rendu actuel `loading / success / error` marche).
- Réécriture des composants consommateurs (`DashboardPage`, `LayerLegend`) — leur contrat avec `useDatasets` est préservé.

## Architecture

```
┌────────────────────────────────────────────┐
│ <QueryClientProvider client={queryClient}> │   ← main.jsx
│   <App />                                  │
│   <ReactQueryDevtools /> (dev only)        │
└────────────────────────────────────────────┘
                ↓
       useQuery / useQueries
                ↓
        queryFn → loadDataset(entry)
                ↓
  TanStack Query : cache + retry + dedup + refetch
                ↓
    /api/datahub/... → Vercel CDN → DataHub
```

Le `queryClient` est un singleton créé une fois, configuré dans `src/lib/queryClient.js` :

```js
new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && !error.message?.startsWith('HTTP 4'),
      retryDelay: (attempt) => 500 * attempt,
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})
```

- `retry: (failureCount, error) => failureCount < 2 && !error.message?.startsWith('HTTP 4')` réplique la logique de `fetchWithRetry` actuelle (2 tentatives max, pas de retry sur 4xx).
- `retryDelay: 500 * attempt` réplique le backoff linéaire actuel.
- `staleTime: 30 min` : pas de refetch tant que les données sont fraîches.
- `gcTime: 1 h` : garde le cache mémoire 1h après que la query n'ait plus de subscriber.
- `refetchOnWindowFocus: true` : refetch silencieux quand l'utilisateur revient sur l'onglet (si stale).

## Composants

| Fichier | Statut | Rôle |
|---|---|---|
| `src/lib/queryClient.js` | **nouveau** | Crée et exporte le `queryClient` singleton. Module séparé pour pouvoir l'importer en tests sans recréer la config. |
| `src/main.jsx` | modifié | Wrap `<App />` dans `<QueryClientProvider client={queryClient}>` + `<ReactQueryDevtools />` conditionnel sur `import.meta.env.DEV`. |
| `src/datasets/loadDataset.js` | simplifié | Pure `queryFn` : fetch → throw si !ok → `{features}`. Plus de cache, plus de `degraded`, plus de `fetchImpl` injecté (tests via mock global). |
| `src/datasets/fetchWithRetry.js` | **supprimé** | Retry intégré au queryClient. |
| `src/__tests__/datasets/fetchWithRetry.test.js` | **supprimé** | |
| `src/dashboard/useDatasets.js` | réécrit | Utilise `useQueries`. Retourne le même objet `{ [id]: { status, dataset, error, degraded } }` qu'aujourd'hui. `degraded = query.failureCount > 0`. |
| `src/dashboard/useContours.js` | réécrit | `useQuery` simple sur l'entry contours. Retourne `{ zones, zoneNames, nameField, resolver }` comme aujourd'hui. |
| `src/dashboard/DashboardPage.jsx` | modifié | L'`useEffect` qui charge `carrefours-feux` est remplacé par un `useQuery`. |
| `src/__tests__/testQueryClient.js` | **nouveau** | Helper test : `renderWithQueryClient(component)` et `createTestQueryClient()` (retry disabled, cache fresh). |
| `src/__tests__/datasets/loadDataset.test.js` | modifié | Simplifié : pas de degraded, mock `fetch` global, vérifie URL + features. |
| `src/__tests__/dashboard/useDatasets.test.js` | modifié | Wrap dans `QueryClientProvider` de test, asserte les mêmes propriétés. |
| `src/__tests__/dashboard/useContours.test.js` | **nouveau si manquant** | Test minimal du nouveau hook. |
| `src/__tests__/dashboard/LayerLegend.test.jsx` | inchangé | Le badge consomme toujours `it.degraded` boolean. |
| `package.json` | modifié | + `@tanstack/react-query`, + devDep `@tanstack/react-query-devtools`. |

## Flux de données

```
DashboardPage(domaine)
  ├─ useContours()                    → useQuery(['contours'])     → loadDataset(CONTOURS)
  ├─ useDatasets(entries)             → useQueries(entries.map)    → loadDataset(entry)
  └─ useQuery(['dataset', 'carrefours-feux']) → loadDataset(...)
```

Si deux composants demandent la même `queryKey`, TanStack Query dedup automatiquement (une seule requête réseau, deux subscribers). Pour `carrefours-feux`, sa queryKey `['dataset', 'carrefours-feux']` est la même que ce qui sortirait de `useDatasets` côté mobilité — donc le re-fetch est évité.

## Code clef — `useDatasets.js` réécrit

```js
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'

export function useDatasets(entries) {
  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['dataset', entry.id],
      queryFn: () => loadDataset(entry),
    })),
  })

  return useMemo(() => Object.fromEntries(entries.map((entry, i) => {
    const r = results[i]
    if (r.isPending) {
      return [entry.id, { status: 'chargement', dataset: null, error: null, degraded: false }]
    }
    if (r.isError) {
      return [entry.id, { status: 'erreur', dataset: null, error: r.error?.message ?? 'unknown', degraded: false }]
    }
    return [entry.id, { status: 'pret', dataset: r.data, error: null, degraded: r.failureCount > 0 }]
  })), [entries, results])
}
```

## Code clef — `loadDataset.js` simplifié

```js
function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}`
  }
  if (source.type === 'opendatasoft') {
    return `/api/opendata/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

export async function loadDataset(entry) {
  const response = await fetch(buildUrl(entry.source))
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const geojson = await response.json()
  return { features: geojson?.features ?? [] }
}
```

## Code clef — `main.jsx` modifié

```js
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/queryClient'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
)
```

## Tests

Helper `src/__tests__/testQueryClient.js` :

```js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,           // pas de retry en test : on veut voir l'erreur immédiatement
        gcTime: Infinity,       // pas de garbage collection pendant le test
        staleTime: Infinity,    // données toujours fraîches
      },
    },
  })
}

export function wrapWithQueryClient(client) {
  return ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}
```

`useDatasets.test.js` est adapté pour wrapper `renderHook` :

```js
const client = createTestQueryClient()
const { result } = renderHook(() => useDatasets(entries), {
  wrapper: wrapWithQueryClient(client),
})
```

## Gestion d'erreurs

- **5xx + erreur réseau** : retry 2 fois (linéaire 500 ms, 1000 ms). Après échec : `isError: true`, message dans `error.message`. Badge "erreur" dans la légende (inchangé).
- **4xx** : pas de retry. `isError: true` immédiat.
- **Refetch silencieux échoue** : TanStack Query garde les données précédentes affichées (`data` reste), mais `isError` peut signaler le problème en background. Comportement par défaut : on n'affiche pas d'erreur si `data` est encore disponible. Acceptable.
- **Badge "dégradé"** : `query.failureCount > 0` → la sémantique est légèrement différente (`failureCount` se reset à 0 sur succès, mais il est lu pendant que la query est "pending → success" donc l'instant entre retry et succès reflète bien le degraded). À tester explicitement.

## Sécurité

Aucun changement par rapport à Étape 2. L'URL `/api/datahub/...` est inchangée, la clé reste server-side.

## Performance

- **Première visite** : identique (TanStack Query déclenche le fetch comme avant, cache CDN sert).
- **Navigation entre routes** : meilleure — les datasets partagés (`carrefours-feux` notamment) sont dedupliqués.
- **Retour sur l'onglet après 30 min** : refetch silencieux automatique, l'utilisateur voit potentiellement des données mises à jour sans cliquer.
- **Bundle** : +~12 kB gzip (`@tanstack/react-query` core). `react-query-devtools` est en devDep, pas dans le bundle prod.

## Critères d'acceptation

- [ ] Le dashboard se charge visuellement comme avant sur `/dashboard/mobilite` et `/dashboard/stationnement`.
- [ ] Tests verts (~85 environ — quelques-uns disparaissent avec `fetchWithRetry.test.js`, quelques-uns ajoutés/adaptés).
- [ ] `npm run build` succède.
- [ ] Bundle gzip augmente de ~10-15 kB max.
- [ ] En dev, l'icône React Query DevTools apparaît en bas à gauche et permet d'inspecter le cache.
- [ ] En prod (build), DevTools absent du bundle.
- [ ] Quand un endpoint renvoie 503 puis 200 (simulable via mock), le badge "dégradé" apparaît dans la légende.
- [ ] Aucune nouvelle clé API ou variable d'env requise.
- [ ] `vercel.json` et `api/datahub/[...path].js` restent inchangés.

## Risques et trade-offs

- **Risque : sémantique `degraded` légèrement différente.** `failureCount` n'est pas exactement `attemptsUsed - 1` au sens strict ; il peut être 0 si la query succède immédiatement, et reste >0 pendant un certain temps après un retry réussi. À couvrir par test.
- **Trade-off : +12 kB gzip** vs. zéro nouvelle dépendance. Justifié pour bénéficier de l'écosystème (DevTools, dedup, refetch automatique, conventions standard).
- **Trade-off : refetch on focus** peut sembler bruyant si un utilisateur a 4 onglets ouverts. Cache CDN absorbe ça (les requêtes réseau hors fenêtre staleTime sont gratuites côté serveur). Tolérable.
- **Risque : tests qui touchent `useQueries`** ont une surface d'API plus complexe que `useState + useEffect`. Mitigation : helper `wrapWithQueryClient` centralisé, mock `loadDataset` via spyOn comme aujourd'hui.
- **Pas d'AbortController testé explicitement** : on fait confiance à TanStack Query (lib mature, ~10M téléchargements/semaine).
