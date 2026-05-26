# TanStack Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centraliser le chargement des datasets (cache, retry, refetch) via TanStack Query, supprimer `fetchWithRetry`, et préserver tous les contrats existants côté UI.

**Architecture:** Un `QueryClient` singleton configuré dans `src/lib/queryClient.js` (retry 2 + 4xx skip + staleTime 30 min + refetchOnWindowFocus). `<QueryClientProvider>` ajouté à la racine de `main.jsx`. `useDatasets` réécrit avec `useQueries`, `useContours` avec `useQuery`, l'effet ad-hoc dans `DashboardPage` aussi avec `useQuery`. `loadDataset` devient une simple `queryFn`. ReactQueryDevtools en dev uniquement.

**Tech Stack:** React 19 + TanStack Query 5 + Vitest 4. Bundle prod augmente de ~12 kB gzip ; devtools en devDep, hors prod.

**Spec :** [docs/superpowers/specs/2026-05-26-tanstack-query-design.md](../specs/2026-05-26-tanstack-query-design.md)

---

## File Structure

**Nouveaux fichiers :**
- `src/lib/queryClient.js` — singleton QueryClient + sa config.
- `src/__tests__/testQueryClient.js` — helper test (createTestQueryClient + wrapWithQueryClient).

**Fichiers modifiés :**
- `package.json` — ajout `@tanstack/react-query` (dep) et `@tanstack/react-query-devtools` (devDep).
- `src/main.jsx` — wrap dans `<QueryClientProvider>` + DevTools conditionnel.
- `src/datasets/loadDataset.js` — simplifié : queryFn pure, plus de cache/degraded/fetchImpl.
- `src/dashboard/useDatasets.js` — réécrit avec `useQueries`.
- `src/dashboard/useContours.js` — réécrit avec `useQuery`.
- `src/dashboard/DashboardPage.jsx` — `useEffect` carrefours-feux remplacé par `useQuery`.
- `src/__tests__/datasets/loadDataset.test.js` — simplifié (plus de degraded, mock `fetch` global).
- `src/__tests__/dashboard/useDatasets.test.js` — wrap dans QueryClientProvider de test.

**Fichiers supprimés :**
- `src/datasets/fetchWithRetry.js`
- `src/__tests__/datasets/fetchWithRetry.test.js`

**À NE PAS toucher :**
- `api/datahub/[...path].js` (Vercel function — inchangée).
- `vercel.json` (inchangé).
- `vite.config.js` (inchangé — le proxy dev fonctionne déjà).
- `src/dashboard/LayerLegend.jsx` — consomme toujours `it.degraded`, contrat inchangé.
- `src/dashboard/DashboardContext.jsx`, `dashboardReducer.js`, `filtering.js`, etc.
- `scripts/audit-datahub.mjs` (script Node, indépendant).

---

## Task 1 : Installer les dépendances TanStack Query

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1 : Installer `@tanstack/react-query`**

```bash
npm install @tanstack/react-query
```

Expected: aucune erreur. `package.json` se met à jour avec `@tanstack/react-query` dans `dependencies`.

- [ ] **Step 2 : Installer `@tanstack/react-query-devtools` en devDep**

```bash
npm install --save-dev @tanstack/react-query-devtools
```

Expected: ajouté dans `devDependencies`.

- [ ] **Step 3 : Vérifier que tout build encore**

Run :

```bash
npm run build
```

Expected: build succeeds, taille du bundle peu changée (les imports ne sont pas encore branchés).

- [ ] **Step 4 : Vérifier tests toujours verts**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: 85/85 passants.

- [ ] **Step 5 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): ajoute @tanstack/react-query et devtools"
```

---

## Task 2 : Créer le `queryClient` singleton

**Files:**
- Create: `src/lib/queryClient.js`

- [ ] **Step 1 : Créer le dossier `src/lib/`**

Sur PowerShell :

```powershell
New-Item -ItemType Directory -Force -Path src/lib | Out-Null
```

- [ ] **Step 2 : Créer `src/lib/queryClient.js`**

Create `src/lib/queryClient.js`:

```js
import { QueryClient } from '@tanstack/react-query'

// Config partagée par toute l'app — singleton.
// - retry: 2 essais sur erreur transitoire (5xx ou réseau), pas sur 4xx
//   (le test du préfixe "HTTP 4" reproduit la logique de l'ex-fetchWithRetry).
// - retryDelay: backoff linéaire 500 ms × n° de tentative.
// - staleTime: 30 min — pas de refetch tant que les données sont fraîches.
// - gcTime: 1 h — garde la donnée en cache mémoire 1 h après le dernier subscriber.
// - refetchOnWindowFocus: refetch silencieux quand on revient sur l'onglet.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && !error?.message?.startsWith('HTTP 4'),
      retryDelay: (attempt) => 500 * attempt,
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})
```

- [ ] **Step 3 : Commit**

```bash
git add src/lib/queryClient.js
git commit -m "feat(query): queryClient singleton — retry, refetch on focus, staleTime 30min"
```

---

## Task 3 : Wrapper l'app dans `<QueryClientProvider>` + DevTools

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1 : Lire l'état actuel de `src/main.jsx`**

```bash
cat src/main.jsx
```

Confirmer qu'il ressemble à un main typique Vite + React Router (`createRoot`, `BrowserRouter`, `<App />`).

- [ ] **Step 2 : Remplacer `src/main.jsx`**

Replace the entire content of `src/main.jsx`:

```jsx
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

Si le `main.jsx` actuel diffère (par exemple n'importe pas `BrowserRouter` ou utilise des imports différents), garder ses imports d'origine et n'ajouter que :
- `QueryClientProvider`, `ReactQueryDevtools`, `queryClient`
- Wrap autour du `<App />`
- DevTools conditionnel

- [ ] **Step 3 : Vérifier que l'app build**

Run :

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4 : Vérifier que l'app démarre en dev**

```bash
npm run dev
```

Ouvrir `http://localhost:<port>/dashboard/mobilite` (Preview MCP, Chrome MCP, ou navigateur).

Vérifier visuellement :
- L'app se charge.
- En bas à gauche : icône React Query DevTools (petite icône violette ou flèche).
- Cliquer dessus → panneau s'ouvre, vide pour l'instant (aucune query encore branchée — c'est attendu).
- Console : aucune erreur React (le warning des futures clés non encore branchées est attendu).

Stop le dev server.

- [ ] **Step 5 : Tests verts**

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: 85/85 verts.

- [ ] **Step 6 : Commit**

```bash
git add src/main.jsx
git commit -m "feat(main): wrap App dans QueryClientProvider + DevTools en dev"
```

---

## Task 4 : Créer le helper test `testQueryClient.js`

**Files:**
- Create: `src/__tests__/testQueryClient.js`

- [ ] **Step 1 : Créer le helper**

Create `src/__tests__/testQueryClient.js`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// QueryClient pour tests : pas de retry, pas de gc, pas de stale → comportement déterministe.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  })
}

// Wrapper pour `renderHook` / `render` qui injecte un QueryClientProvider.
// Usage : renderHook(() => useDatasets(...), { wrapper: wrapWithQueryClient(client) })
export function wrapWithQueryClient(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
```

- [ ] **Step 2 : Vérifier tests toujours verts**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: 85/85 (le helper n'est pas encore utilisé).

- [ ] **Step 3 : Commit**

```bash
git add src/__tests__/testQueryClient.js
git commit -m "test: helper testQueryClient — createTestQueryClient + wrapWithQueryClient"
```

---

## Task 5 : Simplifier `loadDataset.js` (TDD)

**Files:**
- Modify: `src/datasets/loadDataset.js`
- Modify: `src/__tests__/datasets/loadDataset.test.js`

- [ ] **Step 1 : Remplacer le contenu du test**

Replace the entire content of `src/__tests__/datasets/loadDataset.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadDataset } from '../../datasets/loadDataset'

const entry = {
  id: 'arrets-tbm',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
}

function mockFetch(body, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('loadDataset', () => {
  let fetchSpy
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('fetches and returns the feature collection', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ type: 'FeatureCollection', features: [{ id: 1 }, { id: 2 }] }),
    })
    const result = await loadDataset(entry)
    expect(result.features).toHaveLength(2)
  })

  it('returns empty features when the response has none', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    const result = await loadDataset(entry)
    expect(result.features).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve(null),
    })
    await expect(loadDataset(entry)).rejects.toThrow('HTTP 503')
  })

  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ features: [] }),
    })
    await loadDataset(entry)
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/datahub/geojson/features/SV_ARRET_P')
  })

  it('builds the opendatasoft url from the datasetId', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ features: [] }),
    })
    await loadDataset({ id: 'x', source: { type: 'opendatasoft', datasetId: 'FOO' } })
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/opendata/api/explore/v2.1/catalog/datasets/FOO/exports/geojson')
  })

  it('throws on an unsupported source type', async () => {
    await expect(loadDataset({ id: 'x', source: { type: 'bogus' } })).rejects.toThrow('non supporté')
  })
})
```

Changements vs. l'ancien fichier :
- Plus de `clearDatasetCache` (suppressed import) — le cache TanStack Query est géré ailleurs.
- Plus de `fakeFetch` ni `seqFetch` (helpers locaux) — on mock `globalThis.fetch` directement.
- Plus de test `degraded` (la sémantique est portée par `useDatasets` désormais).
- Plus de test « caches the result » (le cache TanStack n'est pas la responsabilité de `loadDataset`).
- Test ajouté : URL opendatasoft + erreur sur type inconnu.

- [ ] **Step 2 : Run les tests pour vérifier qu'ils échouent**

Run :

```bash
npx vitest run --exclude '**/.claude/**' src/__tests__/datasets/loadDataset.test.js
```

Expected: les tests qui passent `fetchImpl` ne compileront pas / échoueront, et l'import de `clearDatasetCache` n'existe plus.

- [ ] **Step 3 : Remplacer `loadDataset.js`**

Replace the entire content of `src/datasets/loadDataset.js`:

```js
// queryFn utilisée par TanStack Query (useQuery / useQueries) pour charger
// un GeoJSON depuis le proxy /api/datahub ou /api/opendata. Pas de cache
// propre : TanStack Query s'en charge. Pas de gestion de retry : idem.
// L'appelant qui veut savoir si un retry a sauvé peut lire query.failureCount.

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

Changements :
- Plus d'import `fetchWithRetry`.
- Plus de `cache` Map ni `clearDatasetCache`.
- Plus de paramètre `fetchImpl` (mock global via `vi.spyOn(globalThis, 'fetch')`).
- Retour `{features}` sans `degraded`.
- Lève `Error('HTTP <status>')` directement, comme avant — la logique 4xx/5xx du queryClient en tient compte.

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run :

```bash
npx vitest run --exclude '**/.claude/**' src/__tests__/datasets/loadDataset.test.js
```

Expected: 6 tests verts.

- [ ] **Step 5 : Run TOUS les tests**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: certains tests qui mockaient `loadDataset` continuent de passer (le contrat de surface n'a pas drastiquement changé : `loadDataset(entry)` → `{features}` toujours), mais `useDatasets.test.js` peut échouer parce qu'il mocke `loadDataset` pour renvoyer `{features, degraded: true}` qui n'est plus interprété (cas couvert en Task 7).

C'est attendu. Note les échecs dans `useDatasets.test.js` mais ne corrige pas ici — Task 7 le fait.

- [ ] **Step 6 : Commit**

```bash
git add src/datasets/loadDataset.js src/__tests__/datasets/loadDataset.test.js
git commit -m "feat(loadDataset): simplifié en queryFn pure — plus de cache/retry/degraded"
```

---

## Task 6 : Supprimer `fetchWithRetry.js` et son test

**Files:**
- Delete: `src/datasets/fetchWithRetry.js`
- Delete: `src/__tests__/datasets/fetchWithRetry.test.js`

- [ ] **Step 1 : Vérifier qu'aucun fichier vivant ne l'importe**

Run :

```bash
git grep -l "fetchWithRetry"
```

Expected: seulement les deux fichiers qu'on s'apprête à supprimer (et peut-être ces docs `docs/superpowers/*.md` — c'est de la prose). Si un autre fichier `src/...` apparaît, STOP et reporter NEEDS_CONTEXT.

- [ ] **Step 2 : Supprimer**

```powershell
Remove-Item src/datasets/fetchWithRetry.js
Remove-Item src/__tests__/datasets/fetchWithRetry.test.js
```

- [ ] **Step 3 : Tests + build**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
npm run build
```

Expected: tests passent (sauf `useDatasets.test.js` connu qui sera réparé en Task 7). Build OK.

- [ ] **Step 4 : Commit**

```bash
git add -A
git commit -m "chore(datasets): supprime fetchWithRetry (retry intégré au queryClient)"
```

---

## Task 7 : Réécrire `useDatasets.js` avec `useQueries`

**Files:**
- Modify: `src/dashboard/useDatasets.js`
- Modify: `src/__tests__/dashboard/useDatasets.test.js`

- [ ] **Step 1 : Remplacer le test**

Replace the entire content of `src/__tests__/dashboard/useDatasets.test.js`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDatasets } from '../../dashboard/useDatasets'
import { createTestQueryClient, wrapWithQueryClient } from '../testQueryClient'
import * as loader from '../../datasets/loadDataset'

describe('useDatasets', () => {
  let client
  beforeEach(() => {
    client = createTestQueryClient()
    vi.spyOn(loader, 'loadDataset')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads every entry and marks each ready', async () => {
    loader.loadDataset.mockResolvedValue({ features: [{ properties: {} }] })
    const entries = [
      { id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } },
      { id: 'b', libelle: 'B', dateField: null, source: { type: 'datahub-geojson', datahubId: 'B' } },
    ]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.dataset.features).toHaveLength(1)
    expect(result.current.a.degraded).toBe(false)
  })

  it('marks a failed entry as erreur without affecting the others', async () => {
    loader.loadDataset.mockImplementation((entry) =>
      entry?.id === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve({ features: [] }))
    const entries = [
      { id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } },
      { id: 'b', libelle: 'B', dateField: null, source: { type: 'datahub-geojson', datahubId: 'B' } },
    ]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('erreur'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.error).toBe('boom')
  })
})
```

Note : les deux tests `degraded:true / degraded:false` de l'ancienne version sont retirés temporairement. Ils sont remplacés ci-dessous :

Ajouter à la fin du `describe`, avant `})` :

```jsx
  it('propagates degraded:true when the queryFn rejected before succeeding', async () => {
    let attempt = 0
    loader.loadDataset.mockImplementation(() => {
      attempt += 1
      if (attempt === 1) return Promise.reject(new Error('HTTP 503'))
      return Promise.resolve({ features: [] })
    })
    // testClient with retry enabled for this case only
    const clientWithRetry = new (await import('@tanstack/react-query')).QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          retryDelay: 0,
          gcTime: Infinity,
          staleTime: Infinity,
          refetchOnWindowFocus: false,
        },
      },
    })
    const entries = [{ id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } }]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(clientWithRetry),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(true)
  })

  it('defaults degraded to false on a clean first-attempt success', async () => {
    loader.loadDataset.mockResolvedValue({ features: [] })
    const entries = [{ id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } }]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(false)
  })
```

- [ ] **Step 2 : Run les tests pour vérifier qu'ils échouent**

Run :

```bash
npx vitest run --exclude '**/.claude/**' src/__tests__/dashboard/useDatasets.test.js
```

Expected: les tests échouent (le hook actuel n'utilise pas le QueryClientProvider et ne propage pas la nouvelle sémantique de degraded).

- [ ] **Step 3 : Remplacer `useDatasets.js`**

Replace the entire content of `src/dashboard/useDatasets.js`:

```js
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine via useQueries.
// Renvoie un objet { [id]: { status, dataset, error, degraded } } — contrat identique
// à l'ancienne version (DashboardPage / LayerLegend ne changent pas).
//   status   ∈ 'chargement' | 'pret' | 'erreur'
//   degraded = true si la query a vu au moins un échec avant de succéder.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- results changent à chaque render par identité, on relit à chaque appel
  })), [entries, results])
}
```

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run :

```bash
npx vitest run --exclude '**/.claude/**' src/__tests__/dashboard/useDatasets.test.js
```

Expected: 4 tests verts.

- [ ] **Step 5 : Run TOUS les tests**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: tous verts.

- [ ] **Step 6 : Commit**

```bash
git add src/dashboard/useDatasets.js src/__tests__/dashboard/useDatasets.test.js
git commit -m "feat(useDatasets): useQueries — contrat préservé, degraded via failureCount"
```

---

## Task 8 : Réécrire `useContours.js` avec `useQuery`

**Files:**
- Modify: `src/dashboard/useContours.js`

- [ ] **Step 1 : Vérifier s'il y a déjà un test pour `useContours`**

Run :

```bash
ls src/__tests__/dashboard | grep -i contour
```

Si vide : pas de test existant. On ne crée pas de test pour ce hook (le testing harness n'a pas de fixtures pour les contours géo, et le hook délègue à `loadDataset` qui est déjà testé). Le hook sera validé par le visuel en Task 10.

Si un test existe : il faudra l'adapter pour wrapper avec QueryClientProvider (modeler sur `useDatasets.test.js`).

- [ ] **Step 2 : Remplacer `useContours.js`**

Replace the entire content of `src/dashboard/useContours.js`:

```js
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'
import { makeZoneResolver, detectNameField } from './geo'

const CONTOURS_ENTRY = {
  id: 'contours-communes',
  source: { type: 'datahub-geojson', datahubId: 'FV_COMMU_S' },
}

// Charge les contours des communes de Bordeaux Métropole via useQuery.
// API inchangée vs. l'ancienne version.
export function useContours() {
  const { data } = useQuery({
    queryKey: ['dataset', CONTOURS_ENTRY.id],
    queryFn: () => loadDataset(CONTOURS_ENTRY),
  })
  const features = data?.features ?? []

  const nameField = useMemo(() => detectNameField(features), [features])

  const zoneNames = useMemo(() => {
    if (!nameField) return []
    return [...new Set(features.map((f) => f.properties?.[nameField]).filter(Boolean))].sort()
  }, [features, nameField])

  const resolver = useMemo(() => {
    const base = nameField ? makeZoneResolver(features, nameField) : () => null
    // Priorité au champ `commune` quand il est déjà présent sur la feature :
    // les données DataHub portent souvent cette information à la source, ce
    // qui est plus rapide et plus fiable que le point-dans-polygone.
    return (feature) => {
      const fromProp = feature?.properties?.commune
      if (typeof fromProp === 'string' && fromProp.trim() !== '') return fromProp
      return base(feature)
    }
  }, [features, nameField])

  return { zones: features, zoneNames, nameField, resolver }
}
```

Note : la queryKey `['dataset', CONTOURS_ENTRY.id]` est exactement de la même forme que celle de `useDatasets`, donc si une autre query a déjà chargé `contours-communes` (improbable, mais possible), elle est dedupliquée automatiquement.

- [ ] **Step 3 : Run tous les tests**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: tous verts (aucun test ne touche directement `useContours`, le rendu de DashboardPage continue de marcher).

- [ ] **Step 4 : Commit**

```bash
git add src/dashboard/useContours.js
git commit -m "feat(useContours): useQuery — API inchangée pour les consommateurs"
```

---

## Task 9 : `DashboardPage` — useQuery pour `carrefours-feux`

**Files:**
- Modify: `src/dashboard/DashboardPage.jsx`

- [ ] **Step 1 : Lire le bloc actuel**

Lire les lignes 1-40 de `src/dashboard/DashboardPage.jsx`. Identifier :
- L'import `useState, useEffect`.
- L'import `loadDataset` (utilisé par l'effet).
- Le `const [carrefoursFeatures, setCarrefoursFeatures] = useState([])` et son `useEffect` (vers les lignes 32-39).

- [ ] **Step 2 : Modifier les imports**

Dans `src/dashboard/DashboardPage.jsx`, remplacer la ligne d'import React :

```js
import { useMemo, useState, useEffect } from 'react'
```

par :

```js
import { useMemo } from 'react'
```

Supprimer l'import :

```js
import { loadDataset } from '../datasets/loadDataset'
```

Ajouter en début de fichier (après les imports React/Router) :

```js
import { useQuery } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'
```

(Note : on garde l'import `loadDataset` car il sert encore comme queryFn ici.)

- [ ] **Step 3 : Remplacer l'effet `carrefours-feux`**

Remplacer le bloc :

```js
  const [carrefoursFeatures, setCarrefoursFeatures] = useState([])
  useEffect(() => {
    let cancelled = false
    loadDataset({ id: 'carrefours-feux', source: { type: 'datahub-geojson', datahubId: 'PC_CARF_P' } })
      .then((d) => { if (!cancelled) setCarrefoursFeatures(d.features ?? []) })
      .catch(() => { if (!cancelled) setCarrefoursFeatures([]) })
    return () => { cancelled = true }
  }, [])
```

par :

```js
  // Carrefours à feux : chargé via useQuery indépendamment du domaine actif.
  // Sert de proxy de « demande » dans le diagramme offre/demande stationnement.
  // La queryKey est la même que celle qui sortirait de useDatasets côté mobilité,
  // donc dedup automatique si les deux usages coexistent.
  const carrefoursQuery = useQuery({
    queryKey: ['dataset', 'carrefours-feux'],
    queryFn: () => loadDataset({ id: 'carrefours-feux', source: { type: 'datahub-geojson', datahubId: 'PC_CARF_P' } }),
  })
  const carrefoursFeatures = carrefoursQuery.data?.features ?? []
```

- [ ] **Step 4 : Tests + build + dev**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
npm run build
```

Expected: les deux passent.

Test visuel rapide :

```bash
npm run dev
```

Ouvrir `/dashboard/stationnement`, vérifier que le graphique « offre vs demande » s'affiche (il dépend de `carrefoursFeatures`).

Stop le dev server.

- [ ] **Step 5 : Commit**

```bash
git add src/dashboard/DashboardPage.jsx
git commit -m "feat(dashboard): carrefours-feux via useQuery (dedup avec useDatasets)"
```

---

## Task 10 : Vérification finale + push

**Files:** aucun (vérification + push).

- [ ] **Step 1 : Tous les tests verts**

Run :

```bash
npx vitest run --exclude '**/.claude/**'
```

Expected: 100 % verts. Le total peut différer de 85 (suppression de `fetchWithRetry.test.js` − 6 tests + nouvelles assertions ailleurs).

- [ ] **Step 2 : Lint**

Run :

```bash
npm run lint -- --ignore-pattern '.claude/**'
```

Expected: 0 erreur sur les fichiers modifiés/créés par cette étape.

- [ ] **Step 3 : Build production**

Run :

```bash
npm run build
```

Expected: build succeeds. Bundle gzip de l'ordre de **+10 à +15 kB** par rapport à pré-Étape-3 (`@tanstack/react-query` core). Si la taille augmente de >25 kB gzip, investiguer (les DevTools sont peut-être incluses par erreur).

Mesurer en comparant avec pré-Étape-3 :

```bash
git stash 2>$null
git checkout e843d0c -- src dist 2>$null
npm run build 2>&1 | grep -E "dist/assets/index"
# noter la taille
git checkout HEAD -- src dist
npm run build 2>&1 | grep -E "dist/assets/index"
# noter la nouvelle taille
git stash pop 2>$null
```

(Approximation acceptable : juste comparer le `gzip` dans la dernière ligne de build.)

- [ ] **Step 4 : Audit APIs (optionnel, lent)**

Run :

```bash
npm run audit:apis
```

Expected: 31/31 OK (ou état similaire à l'Étape 2 — le script ne dépend pas de TanStack).

- [ ] **Step 5 : Test visuel complet**

Run :

```bash
npm run dev
```

Ouvrir via Preview MCP ou navigateur :
- `http://localhost:<port>/dashboard/mobilite` :
  - Tous les jeux chargent.
  - Charts visibles sous la carte.
  - Légende des jeux fonctionnelle.
  - **Icône React Query DevTools en bas à gauche** — cliquer dessus, voir les ~28 queries listées avec leur état.
- `http://localhost:<port>/dashboard/stationnement` :
  - Idem, charts différents, graphique offre/demande peuplé.
- Pas d'erreur dans la console.

Stop le dev server.

- [ ] **Step 6 : Push vers origin/main**

```bash
git status   # vérifier working tree clean (rien de stagé sauf untracked .claude/, .pptx)
git push origin main
```

Expected: push succeeds.

- [ ] **Step 7 : Récap final**

Écrire un message court récapitulant :
- Liste des commits ajoutés par l'Étape 3.
- Bundle gzip avant/après (delta réel).
- Tests : combien verts, combien supprimés (fetchWithRetry).
- React Query DevTools opérationnels en dev, absents en prod.
- Plus aucune référence à `fetchWithRetry` ou `clearDatasetCache` dans le repo.
- Plan global terminé : Étapes 1, 2 et 3 ✅.
- Prochaine action utilisateur : déployer sur Vercel via `docs/DEPLOYMENT.md` (si pas déjà fait).

---

## Self-review du plan

**Couverture du spec :**
- Objectif 1 (chargement centralisé via queryClient) → Tasks 2, 3.
- Objectif 2 (refetch silencieux 30 min sur focus) → Task 2 (config queryClient).
- Objectif 3 (AbortController auto) → implicite via TanStack Query (pas d'action spécifique).
- Objectif 4 (DevTools) → Task 1 (install), Task 3 (wire), Task 10 (vérif visuelle).
- Objectif 5 (suppression fetchWithRetry) → Task 5 (loadDataset perd l'import), Task 6 (suppression effective).
- Objectif 6 (préservation comportement) → Task 7 (contrat useDatasets), Task 8 (contrat useContours), Task 9 (carrefours-feux refactor), Task 10 (vérif visuelle).
- Critères d'acceptation (badge degraded via failureCount) → Task 7 Step 1 (test explicite).

**Placeholders :** aucun.

**Cohérence des types :**
- `useDatasets` retourne toujours `{ [id]: { status, dataset, error, degraded } }` — vérifié dans Task 7 test (contrat) et code.
- `useContours` retourne toujours `{ zones, zoneNames, nameField, resolver }` — vérifié dans Task 8 code.
- `loadDataset(entry)` retourne `{features}` (plus `degraded`) — Task 5 redéfinit, Task 7 et 8 ne dépendent plus de `degraded` côté loader.
- `degraded` côté hook = `failureCount > 0` — cohérent entre useDatasets (Task 7) et l'absence dans useContours (où le degraded n'est pas remonté car aucun consommateur ne le lit).

**Risques d'exécution :**
- Task 5 (loadDataset) casse temporairement `useDatasets.test.js` qui mocke encore avec la signature `{features, degraded}`. Task 7 répare. Si on inverse l'ordre, on a un état intermédiaire pire.
- Le commit de Task 6 (suppression fetchWithRetry) ne casse rien à condition que Task 5 ait bien retiré l'import. Vérifié dans Task 6 Step 1 (grep).
- Task 7 Step 1 inclut un test avec `retry: 1` pour valider le degraded — ce test est plus complexe (importation dynamique de QueryClient avec retry). Si problématique, peut être réduit à un simple test de propagation après mock manuel de `failureCount`. Garder en mind.
