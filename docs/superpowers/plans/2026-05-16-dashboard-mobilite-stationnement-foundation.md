# Dashboard Mobilité & Stationnement — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of a decision-support dashboard for Bordeaux Métropole — router, dataset registry, generic loaders, the layout-B dashboard shell, filtering pipeline and charts — proven end-to-end on three already-known DataHub datasets.

**Architecture:** The current real-time map app becomes a secondary "Live" mode reached via router. The dashboard is driven by a declarative dataset registry; a generic loader fetches DataHub GeoJSON and caches it; pure filtering functions derive what the map and Recharts charts display. This plan delivers working software with three seed datasets (mobilité domain); the remaining 22 datasets are added later as registry entries once the user supplies their DataHub IDs.

**Tech Stack:** React 19, Vite, Leaflet/react-leaflet, react-router-dom (new), Recharts (new), Vitest + Testing Library.

**Scope note — deviation from spec:** The spec's file tree shows the existing real-time code physically moved under `src/live/`. To avoid a large, error-prone cross-file import rewrite, this plan keeps the existing `src/components/` and `src/hooks/` files in place and isolates the live mode behind a new `src/live/LivePage.jsx` route component. The live mode is preserved exactly as-is and reachable only via `/live`, which satisfies the spec's intent. Flag this to the user if a literal physical move is required.

**Scope note — seed datasets:** Only the mobilité domain has seed datasets (VCub, arrêts, carrefours — IDs already known from `src/services/api.js`). The stationnement domain renders the full shell with an explicit empty state until the user supplies DataHub IDs. Geographic filtering operates on a `commune` feature property; point-in-polygon zone matching against an administrative-contours dataset is deferred to the dataset-population plan.

---

## File Structure

**Created:**
- `src/datasets/schema.js` — domain/mode/geometry constants + `validateEntry`
- `src/datasets/registry.js` — the dataset catalog (3 seed entries)
- `src/datasets/loadDataset.js` — generic DataHub GeoJSON loader + memory cache
- `src/dashboard/filtering.js` — pure filter pipeline (`selectDatasets`, `filterFeatures`)
- `src/dashboard/freshness.js` — dataset date extraction + formatting helpers
- `src/dashboard/DashboardContext.jsx` — `useReducer` state (domaine + 4 filters)
- `src/dashboard/dashboardReducer.js` — pure reducer (separated for testing)
- `src/dashboard/DashboardPage.jsx` — route component, assembles layout B
- `src/dashboard/dashboard.css` — layout-B styles
- `src/dashboard/TopBar.jsx` — domain toggle + Live button + global freshness
- `src/dashboard/FilterRail.jsx` — the 4 filters
- `src/dashboard/KpiRow.jsx`, `src/dashboard/KpiCard.jsx`
- `src/dashboard/ChartGrid.jsx`, `src/dashboard/FeaturesByDatasetChart.jsx`
- `src/dashboard/DashboardMap.jsx`
- `src/dashboard/components/GeoJsonLayer.jsx`
- `src/dashboard/components/ChartCard.jsx` — titled card with freshness badge
- `src/dashboard/components/FreshnessBadge.jsx`
- `src/shared/BaseMap.jsx` — reusable Leaflet map container
- `src/live/LivePage.jsx` — current App body, isolated as the live mode
- Tests under `src/__tests__/` mirroring the above

**Modified:**
- `src/main.jsx` — wrap app in `<BrowserRouter>`
- `src/App.jsx` — becomes the route switch
- `package.json` — new dependencies (via npm install)

---

## Task 1: Add dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install react-router-dom and recharts**

Run: `npm install react-router-dom recharts`
Expected: both packages added to `dependencies`, exit code 0.

- [ ] **Step 2: Verify install**

Run: `npm ls react-router-dom recharts`
Expected: both listed with resolved versions, no `UNMET DEPENDENCY`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add react-router-dom and recharts"
```

---

## Task 2: Dataset schema and entry validation

**Files:**
- Create: `src/datasets/schema.js`
- Test: `src/__tests__/datasets/schema.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/datasets/schema.test.js
import { describe, it, expect } from 'vitest'
import { DOMAINES, MODES, GEOMETRIES, validateEntry } from '../../datasets/schema'

const valid = {
  id: 'arrets-tbm',
  domaine: 'mobilite',
  libelle: 'Arrêts de transport en commun',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
  geometrie: 'point',
  mode: ['bus_tram'],
  categorie: 'arrets',
  dateField: 'mdate',
  millesime: null,
  viz: ['carte', 'kpi-comptage'],
}

describe('schema', () => {
  it('exposes the enum constants', () => {
    expect(DOMAINES).toEqual(['mobilite', 'stationnement'])
    expect(MODES).toContain('velo')
    expect(GEOMETRIES).toEqual(['point', 'ligne', 'polygone'])
  })

  it('accepts a valid entry', () => {
    expect(validateEntry(valid)).toEqual([])
  })

  it('reports a missing id', () => {
    expect(validateEntry({ ...valid, id: '' })).toContain('id manquant')
  })

  it('reports an invalid domaine', () => {
    expect(validateEntry({ ...valid, domaine: 'autre' }))
      .toContain('domaine invalide: autre')
  })

  it('reports an invalid geometrie', () => {
    expect(validateEntry({ ...valid, geometrie: 'cube' }))
      .toContain('geometrie invalide: cube')
  })

  it('reports an unknown mode', () => {
    expect(validateEntry({ ...valid, mode: ['fusee'] }))
      .toContain('mode invalide: fusee')
  })

  it('reports a non-array mode', () => {
    expect(validateEntry({ ...valid, mode: 'velo' }))
      .toContain('mode doit être un tableau')
  })

  it('reports a missing categorie', () => {
    expect(validateEntry({ ...valid, categorie: '' }))
      .toContain('categorie manquante')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/datasets/schema.test.js`
Expected: FAIL — cannot resolve `../../datasets/schema`.

- [ ] **Step 3: Write the implementation**

```js
// src/datasets/schema.js
export const DOMAINES = ['mobilite', 'stationnement']
export const MODES = ['pieton', 'velo', 'bus_tram', 'voiture', 'autopartage', 'freefloating']
export const GEOMETRIES = ['point', 'ligne', 'polygone']

// Returns an array of human-readable error strings. Empty array = valid.
export function validateEntry(entry) {
  const errors = []
  if (!entry.id) errors.push('id manquant')
  if (!DOMAINES.includes(entry.domaine)) errors.push(`domaine invalide: ${entry.domaine}`)
  if (!entry.libelle) errors.push('libelle manquant')
  if (!GEOMETRIES.includes(entry.geometrie)) errors.push(`geometrie invalide: ${entry.geometrie}`)
  if (!Array.isArray(entry.mode)) {
    errors.push('mode doit être un tableau')
  } else {
    for (const m of entry.mode) {
      if (!MODES.includes(m)) errors.push(`mode invalide: ${m}`)
    }
  }
  if (!entry.categorie) errors.push('categorie manquante')
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/datasets/schema.test.js`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/datasets/schema.js src/__tests__/datasets/schema.test.js
git commit -m "feat: dataset schema constants and entry validation"
```

---

## Task 3: Dataset registry with seed entries

**Files:**
- Create: `src/datasets/registry.js`
- Test: `src/__tests__/datasets/registry.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/datasets/registry.test.js
import { describe, it, expect } from 'vitest'
import { REGISTRY, entriesForDomaine } from '../../datasets/registry'
import { validateEntry } from '../../datasets/schema'

describe('registry', () => {
  it('every entry is valid against the schema', () => {
    for (const entry of REGISTRY) {
      expect(validateEntry(entry), `entrée ${entry.id}`).toEqual([])
    }
  })

  it('has no duplicate ids', () => {
    const ids = REGISTRY.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns only entries for the requested domaine', () => {
    const mob = entriesForDomaine('mobilite')
    expect(mob.length).toBeGreaterThan(0)
    expect(mob.every((e) => e.domaine === 'mobilite')).toBe(true)
    expect(entriesForDomaine('stationnement').every((e) => e.domaine === 'stationnement')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/datasets/registry.test.js`
Expected: FAIL — cannot resolve `../../datasets/registry`.

- [ ] **Step 3: Write the implementation**

```js
// src/datasets/registry.js
// Catalogue déclaratif des jeux de données du dashboard.
// Les 3 entrées ci-dessous utilisent des identifiants DataHub déjà connus
// (cf. src/services/api.js). Les autres jeux seront ajoutés ici à réception
// de leurs identifiants DataHub.
export const REGISTRY = [
  {
    id: 'arrets-tbm',
    domaine: 'mobilite',
    libelle: 'Arrêts de transport en commun',
    source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
    geometrie: 'point',
    mode: ['bus_tram'],
    categorie: 'arrets',
    dateField: 'mdate',
    millesime: null,
    viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'carrefours-feux',
    domaine: 'mobilite',
    libelle: 'Carrefours à feux',
    source: { type: 'datahub-geojson', datahubId: 'PC_CARF_P' },
    geometrie: 'point',
    mode: ['voiture'],
    categorie: 'carrefours',
    dateField: 'mdate',
    millesime: null,
    viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'vcub-stations',
    domaine: 'mobilite',
    libelle: 'Stations VCub',
    source: { type: 'datahub-geojson', datahubId: 'CI_VCUB_P' },
    geometrie: 'point',
    mode: ['velo'],
    categorie: 'velo-libre-service',
    dateField: 'mdate',
    millesime: null,
    viz: ['carte', 'kpi-comptage'],
  },
]

export function entriesForDomaine(domaine) {
  return REGISTRY.filter((e) => e.domaine === domaine)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/datasets/registry.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/datasets/registry.js src/__tests__/datasets/registry.test.js
git commit -m "feat: dataset registry with three seed entries"
```

---

## Task 4: Generic dataset loader with memory cache

**Files:**
- Create: `src/datasets/loadDataset.js`
- Test: `src/__tests__/datasets/loadDataset.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/datasets/loadDataset.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadDataset, clearDatasetCache } from '../../datasets/loadDataset'

const entry = {
  id: 'arrets-tbm',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
}

function fakeFetch(body, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('loadDataset', () => {
  beforeEach(() => clearDatasetCache())

  it('fetches and returns the feature collection', async () => {
    const fc = { type: 'FeatureCollection', features: [{ id: 1 }, { id: 2 }] }
    const fetchImpl = fakeFetch(fc)
    const result = await loadDataset(entry, { fetchImpl })
    expect(result.features).toHaveLength(2)
  })

  it('caches the result — second call does not refetch', async () => {
    const fetchImpl = fakeFetch({ features: [{ id: 1 }] })
    await loadDataset(entry, { fetchImpl })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns empty features when the response has none', async () => {
    const result = await loadDataset(entry, { fetchImpl: fakeFetch({}) })
    expect(result.features).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = fakeFetch(null, false, 503)
    await expect(loadDataset(entry, { fetchImpl })).rejects.toThrow('HTTP 503')
  })

  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    const fetchImpl = fakeFetch({ features: [] })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/datahub/geojson/features/SV_ARRET_P')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/datasets/loadDataset.test.js`
Expected: FAIL — cannot resolve `../../datasets/loadDataset`.

- [ ] **Step 3: Write the implementation**

```js
// src/datasets/loadDataset.js
const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY
const cache = new Map()

function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}?key=${DATAHUB_KEY}`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

// Charge un jeu de données et met le résultat en cache mémoire (clé = entry.id).
// fetchImpl est injectable pour les tests.
export async function loadDataset(entry, { fetchImpl = fetch } = {}) {
  if (cache.has(entry.id)) return cache.get(entry.id)
  const res = await fetchImpl(buildUrl(entry.source))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const geojson = await res.json()
  const result = { features: geojson.features ?? [] }
  cache.set(entry.id, result)
  return result
}

export function clearDatasetCache() {
  cache.clear()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/datasets/loadDataset.test.js`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/datasets/loadDataset.js src/__tests__/datasets/loadDataset.test.js
git commit -m "feat: generic DataHub dataset loader with memory cache"
```

---

## Task 5: Filtering pipeline

**Files:**
- Create: `src/dashboard/filtering.js`
- Test: `src/__tests__/dashboard/filtering.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/dashboard/filtering.test.js
import { describe, it, expect } from 'vitest'
import { selectDatasets, filterFeatures } from '../../dashboard/filtering'

const entries = [
  { id: 'a', categorie: 'arrets', mode: ['bus_tram'], millesime: null },
  { id: 'b', categorie: 'capteurs', mode: ['velo'], millesime: null },
  { id: 'c', categorie: 'capteurs', mode: ['voiture'], millesime: 2019 },
  { id: 'd', categorie: 'capteurs', mode: ['voiture'], millesime: 2024 },
]
const empty = { categories: [], modes: [], annee: null, zone: null }

describe('selectDatasets', () => {
  it('returns all entries when no filter is set', () => {
    expect(selectDatasets(entries, empty).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('filters by categorie', () => {
    expect(selectDatasets(entries, { ...empty, categories: ['arrets'] }).map((e) => e.id))
      .toEqual(['a'])
  })

  it('filters by mode (entry kept if any of its modes matches)', () => {
    expect(selectDatasets(entries, { ...empty, modes: ['velo'] }).map((e) => e.id))
      .toEqual(['b'])
  })

  it('drops millesime-tagged entries that do not match the year', () => {
    const r = selectDatasets(entries, { ...empty, annee: 2019 }).map((e) => e.id)
    expect(r).toEqual(['a', 'b', 'c'])
  })

  it('keeps non-millesime entries regardless of the year filter', () => {
    expect(selectDatasets(entries, { ...empty, annee: 2024 }).map((e) => e.id))
      .toEqual(['a', 'b', 'd'])
  })

  it('combines categorie and mode filters', () => {
    expect(selectDatasets(entries, { ...empty, categories: ['capteurs'], modes: ['voiture'] })
      .map((e) => e.id)).toEqual(['c', 'd'])
  })
})

describe('filterFeatures', () => {
  const features = [
    { properties: { commune: 'Bordeaux' } },
    { properties: { commune: 'Pessac' } },
    { properties: {} },
  ]

  it('returns all features when no zone is set', () => {
    expect(filterFeatures(features, { ...empty })).toHaveLength(3)
  })

  it('keeps only features in the selected zone', () => {
    expect(filterFeatures(features, { ...empty, zone: 'Bordeaux' })).toHaveLength(1)
  })

  it('excludes features without the commune property when a zone is set', () => {
    const r = filterFeatures(features, { ...empty, zone: 'Pessac' })
    expect(r).toEqual([{ properties: { commune: 'Pessac' } }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/filtering.test.js`
Expected: FAIL — cannot resolve `../../dashboard/filtering`.

- [ ] **Step 3: Write the implementation**

```js
// src/dashboard/filtering.js
// Pipeline de filtrage du dashboard — fonctions pures.
// Étape 1 (catégorie + mode + temporel) : quels jeux de données sont retenus.
export function selectDatasets(entries, filters) {
  const { categories = [], modes = [], annee = null } = filters
  return entries.filter((e) => {
    if (categories.length && !categories.includes(e.categorie)) return false
    if (modes.length && !e.mode.some((m) => modes.includes(m))) return false
    if (annee && e.millesime != null && e.millesime !== annee) return false
    return true
  })
}

// Étape 2 (géographique) : quelles features d'un jeu sont retenues.
export function filterFeatures(features, filters) {
  const { zone = null } = filters
  if (!zone) return features
  return features.filter((f) => (f.properties?.commune ?? null) === zone)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/filtering.test.js`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/filtering.js src/__tests__/dashboard/filtering.test.js
git commit -m "feat: dashboard filtering pipeline"
```

---

## Task 6: Freshness helpers

**Files:**
- Create: `src/dashboard/freshness.js`
- Test: `src/__tests__/dashboard/freshness.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/dashboard/freshness.test.js
import { describe, it, expect } from 'vitest'
import { datasetDate, formatFreshness, oldestDate } from '../../dashboard/freshness'

describe('datasetDate', () => {
  const entry = { dateField: 'mdate' }

  it('reads the date field from the first feature', () => {
    const ds = { features: [{ properties: { mdate: '2024-03-01' } }] }
    expect(datasetDate(entry, ds)).toEqual(new Date('2024-03-01'))
  })

  it('returns null when the entry has no dateField', () => {
    expect(datasetDate({ dateField: null }, { features: [] })).toBeNull()
  })

  it('returns null when the dataset has no features', () => {
    expect(datasetDate(entry, { features: [] })).toBeNull()
  })
})

describe('formatFreshness', () => {
  it('formats a valid date in French', () => {
    expect(formatFreshness(new Date('2024-03-01'))).toBe('01/03/2024')
  })

  it('returns "date inconnue" for null', () => {
    expect(formatFreshness(null)).toBe('date inconnue')
  })

  it('returns "date inconnue" for an invalid date', () => {
    expect(formatFreshness(new Date('not-a-date'))).toBe('date inconnue')
  })
})

describe('oldestDate', () => {
  it('returns the earliest valid date', () => {
    const r = oldestDate([new Date('2024-01-01'), new Date('2020-06-01'), null])
    expect(r).toEqual(new Date('2020-06-01'))
  })

  it('returns null when there is no valid date', () => {
    expect(oldestDate([null, undefined])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/freshness.test.js`
Expected: FAIL — cannot resolve `../../dashboard/freshness`.

- [ ] **Step 3: Write the implementation**

```js
// src/dashboard/freshness.js
// Extrait la date d'un jeu de données depuis le champ déclaré dans le registre.
export function datasetDate(entry, dataset) {
  if (!entry.dateField) return null
  const raw = dataset?.features?.[0]?.properties?.[entry.dateField]
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function formatFreshness(date) {
  if (!date || isNaN(date.getTime())) return 'date inconnue'
  return date.toLocaleDateString('fr-FR')
}

// Date la plus ancienne d'une liste (les valeurs nulles/invalides sont ignorées).
export function oldestDate(dates) {
  const valid = dates.filter((d) => d instanceof Date && !isNaN(d.getTime()))
  if (valid.length === 0) return null
  return new Date(Math.min(...valid.map((d) => d.getTime())))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/freshness.test.js`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/freshness.js src/__tests__/dashboard/freshness.test.js
git commit -m "feat: dataset freshness helpers"
```

---

## Task 7: Dashboard reducer

**Files:**
- Create: `src/dashboard/dashboardReducer.js`
- Test: `src/__tests__/dashboard/dashboardReducer.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/dashboard/dashboardReducer.test.js
import { describe, it, expect } from 'vitest'
import { initialState, dashboardReducer } from '../../dashboard/dashboardReducer'

describe('dashboardReducer', () => {
  it('has an initial state with empty filters', () => {
    expect(initialState('mobilite')).toEqual({
      domaine: 'mobilite',
      filters: { categories: [], modes: [], zone: null, annee: null },
    })
  })

  it('SET_DOMAINE changes the domaine and resets filters', () => {
    const dirty = {
      domaine: 'mobilite',
      filters: { categories: ['arrets'], modes: ['velo'], zone: 'Pessac', annee: 2019 },
    }
    expect(dashboardReducer(dirty, { type: 'SET_DOMAINE', domaine: 'stationnement' }))
      .toEqual(initialState('stationnement'))
  })

  it('TOGGLE_CATEGORY adds then removes a category', () => {
    const s1 = dashboardReducer(initialState('mobilite'), { type: 'TOGGLE_CATEGORY', value: 'arrets' })
    expect(s1.filters.categories).toEqual(['arrets'])
    const s2 = dashboardReducer(s1, { type: 'TOGGLE_CATEGORY', value: 'arrets' })
    expect(s2.filters.categories).toEqual([])
  })

  it('TOGGLE_MODE adds then removes a mode', () => {
    const s1 = dashboardReducer(initialState('mobilite'), { type: 'TOGGLE_MODE', value: 'velo' })
    expect(s1.filters.modes).toEqual(['velo'])
    const s2 = dashboardReducer(s1, { type: 'TOGGLE_MODE', value: 'velo' })
    expect(s2.filters.modes).toEqual([])
  })

  it('SET_ZONE sets the zone', () => {
    const s = dashboardReducer(initialState('mobilite'), { type: 'SET_ZONE', value: 'Bordeaux' })
    expect(s.filters.zone).toBe('Bordeaux')
  })

  it('SET_ANNEE sets the year', () => {
    const s = dashboardReducer(initialState('mobilite'), { type: 'SET_ANNEE', value: 2019 })
    expect(s.filters.annee).toBe(2019)
  })

  it('RESET_FILTERS clears all filters but keeps the domaine', () => {
    const dirty = {
      domaine: 'stationnement',
      filters: { categories: ['x'], modes: ['velo'], zone: 'z', annee: 2020 },
    }
    expect(dashboardReducer(dirty, { type: 'RESET_FILTERS' })).toEqual(initialState('stationnement'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/dashboardReducer.test.js`
Expected: FAIL — cannot resolve `../../dashboard/dashboardReducer`.

- [ ] **Step 3: Write the implementation**

```js
// src/dashboard/dashboardReducer.js
export function initialState(domaine) {
  return {
    domaine,
    filters: { categories: [], modes: [], zone: null, annee: null },
  }
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function dashboardReducer(state, action) {
  switch (action.type) {
    case 'SET_DOMAINE':
      return initialState(action.domaine)
    case 'TOGGLE_CATEGORY':
      return { ...state, filters: { ...state.filters, categories: toggle(state.filters.categories, action.value) } }
    case 'TOGGLE_MODE':
      return { ...state, filters: { ...state.filters, modes: toggle(state.filters.modes, action.value) } }
    case 'SET_ZONE':
      return { ...state, filters: { ...state.filters, zone: action.value } }
    case 'SET_ANNEE':
      return { ...state, filters: { ...state.filters, annee: action.value } }
    case 'RESET_FILTERS':
      return initialState(state.domaine)
    default:
      return state
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/dashboardReducer.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/dashboardReducer.js src/__tests__/dashboard/dashboardReducer.test.js
git commit -m "feat: dashboard state reducer"
```

---

## Task 8: DashboardContext

**Files:**
- Create: `src/dashboard/DashboardContext.jsx`
- Test: `src/__tests__/dashboard/DashboardContext.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/DashboardContext.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardProvider, useDashboard } from '../../dashboard/DashboardContext'

function Probe() {
  const { state, dispatch } = useDashboard()
  return (
    <div>
      <span data-testid="domaine">{state.domaine}</span>
      <span data-testid="modes">{state.filters.modes.join(',')}</span>
      <button onClick={() => dispatch({ type: 'TOGGLE_MODE', value: 'velo' })}>toggle</button>
    </div>
  )
}

describe('DashboardContext', () => {
  it('provides the initial state for the given domaine', () => {
    render(<DashboardProvider domaine="stationnement"><Probe /></DashboardProvider>)
    expect(screen.getByTestId('domaine')).toHaveTextContent('stationnement')
  })

  it('dispatch updates the state', async () => {
    render(<DashboardProvider domaine="mobilite"><Probe /></DashboardProvider>)
    await userEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('modes')).toHaveTextContent('velo')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/DashboardContext.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/DashboardContext`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/DashboardContext.jsx
import { createContext, useContext, useReducer } from 'react'
import { dashboardReducer, initialState } from './dashboardReducer'

const DashboardContext = createContext(null)

export function DashboardProvider({ domaine, children }) {
  const [state, dispatch] = useReducer(dashboardReducer, domaine, initialState)
  return (
    <DashboardContext.Provider value={{ state, dispatch }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard doit être utilisé dans un DashboardProvider')
  return ctx
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/DashboardContext.test.jsx`
Expected: PASS — 2 tests.

Note: when the route's `:domaine` param changes, `DashboardPage` (Task 16) remounts the provider via a React `key`, so the reducer re-initialises. The provider does not need to react to `domaine` prop changes itself.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/DashboardContext.jsx src/__tests__/dashboard/DashboardContext.test.jsx
git commit -m "feat: dashboard context provider"
```

---

## Task 9: Isolate the live mode into LivePage

**Files:**
- Create: `src/live/LivePage.jsx`
- Reference (do not modify): current `src/App.jsx`

- [ ] **Step 1: Create LivePage with the current App body**

Copy the entire current contents of `src/App.jsx` into a new file `src/live/LivePage.jsx`, renaming the component and fixing the relative import depth (one level deeper than before):

```jsx
// src/live/LivePage.jsx
import { useState } from 'react'
import MapView from '../components/Map/MapView'
import Sidebar from '../components/Sidebar/Sidebar'
import { useTBM } from '../hooks/useTBM'
import { useVCub } from '../hooks/useVCub'
import { useSNCF } from '../hooks/useSNCF'
import { useOpenSky } from '../hooks/useOpenSky'
import { useTrafficLights } from '../hooks/useTrafficLights'
import { useGeolocation } from '../hooks/useGeolocation'
import '../App.css'

export default function LivePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleLayers, setVisibleLayers] = useState({
    tram: true, bus: true, vcub: true, sncf: true, flights: true, traffic: true, lights: true,
  })

  const tbm = useTBM()
  const vcub = useVCub()
  const sncf = useSNCF()
  const openSky = useOpenSky()
  const trafficLights = useTrafficLights()
  const userPosition = useGeolocation()

  function toggleLayer(key) {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="map-container">
        <MapView
          tbm={tbm}
          vcub={vcub}
          sncf={sncf}
          openSky={openSky}
          trafficLights={trafficLights}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          userPosition={userPosition}
        />
      </div>
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        tbm={tbm}
        vcub={vcub}
        sncf={sncf}
        openSky={openSky}
        userPosition={userPosition}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the existing component test suite still passes**

Run: `npx vitest run`
Expected: PASS — all pre-existing tests plus the new ones from Tasks 2-8.

- [ ] **Step 3: Commit**

```bash
git add src/live/LivePage.jsx
git commit -m "refactor: isolate live map mode into LivePage"
```

---

## Task 10: Router

**Files:**
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Test: `src/__tests__/App.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/App.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// Le mode live monte des cartes Leaflet et lance des fetch réseau : on le mocke.
vi.mock('../live/LivePage', () => ({ default: () => <div>LIVE MODE</div> }))
// DashboardPage est lourd (carte + chargement) : on le mocke pour tester le routage seul.
vi.mock('../dashboard/DashboardPage', () => ({
  default: () => <div>DASHBOARD</div>,
}))

describe('App routing', () => {
  it('redirects / to the mobilité dashboard', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })

  it('renders the dashboard for /dashboard/:domaine', () => {
    render(<MemoryRouter initialEntries={['/dashboard/stationnement']}><App /></MemoryRouter>)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })

  it('renders the live page for /live', () => {
    render(<MemoryRouter initialEntries={['/live']}><App /></MemoryRouter>)
    expect(screen.getByText('LIVE MODE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/App.test.jsx`
Expected: FAIL — `App` still renders the old map app, not the routes.

- [ ] **Step 3: Rewrite App.jsx as the route switch**

```jsx
// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './dashboard/DashboardPage'
import LivePage from './live/LivePage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard/mobilite" replace />} />
      <Route path="/dashboard/:domaine" element={<DashboardPage />} />
      <Route path="/live" element={<LivePage />} />
      <Route path="*" element={<Navigate to="/dashboard/mobilite" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 4: Wrap the app in BrowserRouter**

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/App.test.jsx`
Expected: PASS — 3 tests. (`DashboardPage` does not exist yet; the test mocks it, so this passes. Task 16 creates the real file.)

- [ ] **Step 6: Commit**

```bash
git add src/main.jsx src/App.jsx src/__tests__/App.test.jsx
git commit -m "feat: route between dashboard and live modes"
```

---

## Task 11: Reusable BaseMap

**Files:**
- Create: `src/shared/BaseMap.jsx`

- [ ] **Step 1: Create BaseMap**

```jsx
// src/shared/BaseMap.jsx
import { MapContainer, TileLayer } from 'react-leaflet'
import { BORDEAUX_CENTER } from '../services/api'
import 'leaflet/dist/leaflet.css'

// Conteneur de carte Leaflet réutilisable. Les couches sont passées en children.
export default function BaseMap({ children, zoom = 12 }) {
  return (
    <MapContainer
      center={BORDEAUX_CENTER}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      {children}
    </MapContainer>
  )
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npx vitest run`
Expected: PASS — no regressions (BaseMap not yet imported anywhere).

- [ ] **Step 3: Commit**

```bash
git add src/shared/BaseMap.jsx
git commit -m "feat: reusable Leaflet base map"
```

---

## Task 12: FreshnessBadge component

**Files:**
- Create: `src/dashboard/components/FreshnessBadge.jsx`
- Test: `src/__tests__/dashboard/FreshnessBadge.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/FreshnessBadge.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FreshnessBadge from '../../dashboard/components/FreshnessBadge'

describe('FreshnessBadge', () => {
  it('shows the formatted date', () => {
    render(<FreshnessBadge date={new Date('2024-03-01')} />)
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })

  it('shows "date inconnue" when date is null', () => {
    render(<FreshnessBadge date={null} />)
    expect(screen.getByText(/date inconnue/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/FreshnessBadge.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/components/FreshnessBadge`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/components/FreshnessBadge.jsx
import { formatFreshness } from '../freshness'

export default function FreshnessBadge({ date }) {
  return (
    <span className="freshness-badge" title="Date du jeu de données">
      📅 {formatFreshness(date)}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/FreshnessBadge.test.jsx`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/components/FreshnessBadge.jsx src/__tests__/dashboard/FreshnessBadge.test.jsx
git commit -m "feat: freshness badge component"
```

---

## Task 13: ChartCard component

**Files:**
- Create: `src/dashboard/components/ChartCard.jsx`
- Test: `src/__tests__/dashboard/ChartCard.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/ChartCard.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChartCard from '../../dashboard/components/ChartCard'

describe('ChartCard', () => {
  it('renders the title and children when ready', () => {
    render(<ChartCard title="Comptage" status="pret" date={new Date('2024-03-01')}>
      <div>contenu</div>
    </ChartCard>)
    expect(screen.getByText('Comptage')).toBeInTheDocument()
    expect(screen.getByText('contenu')).toBeInTheDocument()
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    render(<ChartCard title="X" status="chargement"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    expect(screen.queryByText('contenu')).not.toBeInTheDocument()
  })

  it('shows an error state', () => {
    render(<ChartCard title="X" status="erreur"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Source indisponible/)).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    render(<ChartCard title="X" status="vide"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Aucune donnée/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/ChartCard.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/components/ChartCard`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/components/ChartCard.jsx
import FreshnessBadge from './FreshnessBadge'

// Carte titrée générique. status ∈ 'chargement' | 'pret' | 'erreur' | 'vide'.
// Utilisée pour les diagrammes et la carte du dashboard.
export default function ChartCard({ title, status = 'pret', date = null, children }) {
  return (
    <section className="chart-card">
      <header className="chart-card-head">
        <h3>{title}</h3>
        {status === 'pret' && <FreshnessBadge date={date} />}
      </header>
      <div className="chart-card-body">
        {status === 'chargement' && <p className="state-msg">Chargement…</p>}
        {status === 'erreur' && <p className="state-msg state-error">Source indisponible</p>}
        {status === 'vide' && <p className="state-msg">Aucune donnée pour cette zone/période</p>}
        {status === 'pret' && children}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/ChartCard.test.jsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/components/ChartCard.jsx src/__tests__/dashboard/ChartCard.test.jsx
git commit -m "feat: chart card with loading/error/empty states"
```

---

## Task 14: TopBar

**Files:**
- Create: `src/dashboard/TopBar.jsx`
- Test: `src/__tests__/dashboard/TopBar.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/TopBar.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopBar from '../../dashboard/TopBar'

function renderBar(props = {}) {
  return render(
    <MemoryRouter>
      <TopBar domaine="mobilite" oldestDate={new Date('2024-03-01')} {...props} />
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('marks the active domaine button', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'Mobilité' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Stationnement' })).not.toHaveClass('active')
  })

  it('links each domaine to its dashboard route', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'Stationnement' }))
      .toHaveAttribute('href', '/dashboard/stationnement')
  })

  it('links to the live mode', () => {
    renderBar()
    expect(screen.getByRole('link', { name: /Mode Live/ })).toHaveAttribute('href', '/live')
  })

  it('shows the oldest data date', () => {
    renderBar()
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/TopBar.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/TopBar`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/TopBar.jsx
import { Link } from 'react-router-dom'
import { formatFreshness } from './freshness'

const DOMAINE_LABELS = { mobilite: 'Mobilité', stationnement: 'Stationnement' }

export default function TopBar({ domaine, oldestDate }) {
  return (
    <header className="topbar">
      <span className="topbar-title">Observatoire Mobilité & Stationnement</span>
      <nav className="domaine-toggle">
        {Object.entries(DOMAINE_LABELS).map(([key, label]) => (
          <Link
            key={key}
            to={`/dashboard/${key}`}
            className={key === domaine ? 'active' : ''}
          >
            {label}
          </Link>
        ))}
      </nav>
      <span className="topbar-freshness">
        Données les plus anciennes : {formatFreshness(oldestDate)}
      </span>
      <Link to="/live" className="live-link">Mode Live →</Link>
    </header>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/TopBar.test.jsx`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/TopBar.jsx src/__tests__/dashboard/TopBar.test.jsx
git commit -m "feat: dashboard top bar with domain toggle"
```

---

## Task 15: FilterRail

**Files:**
- Create: `src/dashboard/FilterRail.jsx`
- Test: `src/__tests__/dashboard/FilterRail.test.jsx`

The FilterRail reads/writes the four filters through `useDashboard`. Available categories/modes/zones/years are passed in as props (computed by `DashboardPage` from the loaded datasets).

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/FilterRail.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardProvider, useDashboard } from '../../dashboard/DashboardContext'
import FilterRail from '../../dashboard/FilterRail'

function StateProbe() {
  const { state } = useDashboard()
  return <span data-testid="state">{JSON.stringify(state.filters)}</span>
}

const options = {
  categories: ['arrets', 'carrefours'],
  modes: ['bus_tram', 'voiture'],
  zones: ['Bordeaux', 'Pessac'],
  annees: [2019, 2024],
}

function renderRail() {
  return render(
    <DashboardProvider domaine="mobilite">
      <FilterRail options={options} />
      <StateProbe />
    </DashboardProvider>,
  )
}

describe('FilterRail', () => {
  it('toggles a category checkbox into the state', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('arrets'))
    expect(screen.getByTestId('state')).toHaveTextContent('"categories":["arrets"]')
  })

  it('toggles a mode checkbox into the state', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('voiture'))
    expect(screen.getByTestId('state')).toHaveTextContent('"modes":["voiture"]')
  })

  it('sets the zone from the select', async () => {
    renderRail()
    await userEvent.selectOptions(screen.getByLabelText('Commune / quartier'), 'Pessac')
    expect(screen.getByTestId('state')).toHaveTextContent('"zone":"Pessac"')
  })

  it('sets the year from the select', async () => {
    renderRail()
    await userEvent.selectOptions(screen.getByLabelText('Année'), '2019')
    expect(screen.getByTestId('state')).toHaveTextContent('"annee":2019')
  })

  it('resets all filters', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('arrets'))
    await userEvent.click(screen.getByRole('button', { name: /Réinitialiser/ }))
    expect(screen.getByTestId('state'))
      .toHaveTextContent('{"categories":[],"modes":[],"zone":null,"annee":null}')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/FilterRail.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/FilterRail`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/FilterRail.jsx
import { useDashboard } from './DashboardContext'

export default function FilterRail({ options }) {
  const { state, dispatch } = useDashboard()
  const { categories, modes, zones, annees } = options
  const { filters } = state

  return (
    <aside className="filter-rail">
      <div className="filter-rail-head">
        <h2>Filtres</h2>
        <button type="button" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Réinitialiser
        </button>
      </div>

      <fieldset>
        <legend>Catégorie de données</legend>
        {categories.length === 0 && <p className="state-msg">Aucune donnée chargée</p>}
        {categories.map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={filters.categories.includes(c)}
              onChange={() => dispatch({ type: 'TOGGLE_CATEGORY', value: c })}
            />
            {c}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Mode de transport</legend>
        {modes.map((m) => (
          <label key={m}>
            <input
              type="checkbox"
              checked={filters.modes.includes(m)}
              onChange={() => dispatch({ type: 'TOGGLE_MODE', value: m })}
            />
            {m}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Géographique</legend>
        <label htmlFor="zone-select">Commune / quartier</label>
        <select
          id="zone-select"
          value={filters.zone ?? ''}
          onChange={(e) => dispatch({ type: 'SET_ZONE', value: e.target.value || null })}
        >
          <option value="">Toute la métropole</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </fieldset>

      <fieldset>
        <legend>Temporel</legend>
        <label htmlFor="annee-select">Année</label>
        <select
          id="annee-select"
          value={filters.annee ?? ''}
          onChange={(e) => dispatch({ type: 'SET_ANNEE', value: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Toutes les années</option>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </fieldset>
    </aside>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/FilterRail.test.jsx`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/FilterRail.jsx src/__tests__/dashboard/FilterRail.test.jsx
git commit -m "feat: filter rail with the four filter dimensions"
```

---

## Task 16: KPI components

**Files:**
- Create: `src/dashboard/KpiCard.jsx`
- Create: `src/dashboard/KpiRow.jsx`
- Test: `src/__tests__/dashboard/KpiRow.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/KpiRow.test.jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiRow from '../../dashboard/KpiRow'

describe('KpiRow', () => {
  it('renders one card per kpi with its label and value', () => {
    const kpis = [
      { label: 'Jeux actifs', value: 3 },
      { label: 'Features affichées', value: 1280 },
    ]
    render(<KpiRow kpis={kpis} />)
    expect(screen.getByText('Jeux actifs')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Features affichées')).toBeInTheDocument()
    expect(screen.getByText('1280')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/KpiRow.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/KpiRow`.

- [ ] **Step 3: Write the implementations**

```jsx
// src/dashboard/KpiCard.jsx
export default function KpiCard({ label, value }) {
  return (
    <div className="kpi-card">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  )
}
```

```jsx
// src/dashboard/KpiRow.jsx
import KpiCard from './KpiCard'

export default function KpiRow({ kpis }) {
  return (
    <div className="kpi-row">
      {kpis.map((k) => <KpiCard key={k.label} label={k.label} value={k.value} />)}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/KpiRow.test.jsx`
Expected: PASS — 1 test.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/KpiCard.jsx src/dashboard/KpiRow.jsx src/__tests__/dashboard/KpiRow.test.jsx
git commit -m "feat: KPI row and card components"
```

---

## Task 17: Features-by-dataset chart

**Files:**
- Create: `src/dashboard/FeaturesByDatasetChart.jsx`
- Test: `src/__tests__/dashboard/FeaturesByDatasetChart.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/dashboard/FeaturesByDatasetChart.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { cloneElement } from 'react'
import { render, screen } from '@testing-library/react'
import FeaturesByDatasetChart from '../../dashboard/FeaturesByDatasetChart'

// jsdom ne mesure pas les dimensions : on remplace ResponsiveContainer
// par un clone du diagramme avec une taille fixe, sinon Recharts ne dessine rien.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 300 }),
  }
})

describe('FeaturesByDatasetChart', () => {
  it('renders a bar label for each dataset', () => {
    const data = [
      { libelle: 'Arrêts', count: 1200 },
      { libelle: 'Carrefours', count: 340 },
    ]
    render(<FeaturesByDatasetChart data={data} />)
    expect(screen.getByText('Arrêts')).toBeInTheDocument()
    expect(screen.getByText('Carrefours')).toBeInTheDocument()
  })

  it('renders an empty message when there is no data', () => {
    render(<FeaturesByDatasetChart data={[]} />)
    expect(screen.getByText(/Aucun jeu de données actif/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/FeaturesByDatasetChart.test.jsx`
Expected: FAIL — cannot resolve `../../dashboard/FeaturesByDatasetChart`.

- [ ] **Step 3: Write the implementation**

```jsx
// src/dashboard/FeaturesByDatasetChart.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// Diagramme en barres : nombre de features retenues par jeu de données actif.
export default function FeaturesByDatasetChart({ data }) {
  if (data.length === 0) {
    return <p className="state-msg">Aucun jeu de données actif</p>
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="libelle" width={140} />
        <Tooltip />
        <Bar dataKey="count" fill="#1e3a5f" name="Features" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/FeaturesByDatasetChart.test.jsx`
Expected: PASS — 2 tests.

Note: Recharts charts do not render in jsdom without dimensions; the test mocks `ResponsiveContainer` to clone the chart with a fixed size. The empty-data branch returns before the chart, so it is unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/FeaturesByDatasetChart.jsx src/__tests__/dashboard/FeaturesByDatasetChart.test.jsx
git commit -m "feat: features-by-dataset bar chart"
```

---

## Task 18: GeoJsonLayer and DashboardMap

**Files:**
- Create: `src/dashboard/components/GeoJsonLayer.jsx`
- Create: `src/dashboard/DashboardMap.jsx`

These render Leaflet layers and are verified manually in Task 20 (jsdom does not render Leaflet tiles meaningfully).

- [ ] **Step 1: Create GeoJsonLayer**

```jsx
// src/dashboard/components/GeoJsonLayer.jsx
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

// Rend les features d'un jeu (point/ligne/polygone). La prop `key` du parent
// doit changer quand les données changent, car <GeoJSON> ne re-rend pas seul.
export default function GeoJsonLayer({ features, color = '#1e3a5f' }) {
  if (!features || features.length === 0) return null
  const data = { type: 'FeatureCollection', features }
  return (
    <GeoJSON
      data={data}
      style={{ color, weight: 2 }}
      pointToLayer={(feature, latlng) =>
        L.circleMarker(latlng, { radius: 5, color, fillOpacity: 0.7 })}
    />
  )
}
```

- [ ] **Step 2: Create DashboardMap**

```jsx
// src/dashboard/DashboardMap.jsx
import BaseMap from '../shared/BaseMap'
import GeoJsonLayer from './components/GeoJsonLayer'

const COLORS = ['#1e3a5f', '#b5651d', '#3a7d44', '#7a3b8f', '#aa2e4a', '#2e7d8f']

// layers: [{ id, features }]
export default function DashboardMap({ layers }) {
  return (
    <BaseMap>
      {layers.map((layer, i) => (
        <GeoJsonLayer
          key={`${layer.id}-${layer.features.length}`}
          features={layer.features}
          color={COLORS[i % COLORS.length]}
        />
      ))}
    </BaseMap>
  )
}
```

- [ ] **Step 3: Verify no test regressions**

Run: `npx vitest run`
Expected: PASS — all tests so far still green.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/components/GeoJsonLayer.jsx src/dashboard/DashboardMap.jsx
git commit -m "feat: dashboard map with generic GeoJSON layers"
```

---

## Task 19: ChartGrid and dashboard styles

**Files:**
- Create: `src/dashboard/ChartGrid.jsx`
- Create: `src/dashboard/dashboard.css`

- [ ] **Step 1: Create ChartGrid**

```jsx
// src/dashboard/ChartGrid.jsx
import ChartCard from './components/ChartCard'
import FeaturesByDatasetChart from './FeaturesByDatasetChart'

// charts: [{ key, title, status, date, type, data }]
// Pour l'instant un seul type de diagramme : 'features-par-jeu'.
export default function ChartGrid({ charts }) {
  return (
    <div className="chart-grid">
      {charts.map((c) => (
        <ChartCard key={c.key} title={c.title} status={c.status} date={c.date}>
          {c.type === 'features-par-jeu' && <FeaturesByDatasetChart data={c.data} />}
        </ChartCard>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create dashboard.css**

```css
/* src/dashboard/dashboard.css */
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, sans-serif;
  color: #1f2933;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0 1rem;
  height: 52px;
  background: #1e3a5f;
  color: #fff;
  flex-shrink: 0;
}
.topbar-title { font-weight: 600; }
.domaine-toggle { display: flex; gap: 0; border: 1px solid #ffffff55; border-radius: 6px; overflow: hidden; }
.domaine-toggle a { padding: 6px 14px; color: #cdd9e5; text-decoration: none; font-size: 0.9rem; }
.domaine-toggle a.active { background: #fff; color: #1e3a5f; font-weight: 600; }
.topbar-freshness { margin-left: auto; font-size: 0.8rem; color: #cdd9e5; }
.live-link { color: #fff; text-decoration: none; font-size: 0.85rem; }

.dashboard-body { display: flex; flex: 1; min-height: 0; }
.dashboard-map { flex: 1; min-width: 0; }
.dashboard-analytics {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 1rem;
  background: #f4f6f8;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.filter-rail {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 1rem;
  background: #fff;
  border-left: 1px solid #d4d4d8;
}
.filter-rail-head { display: flex; justify-content: space-between; align-items: center; }
.filter-rail fieldset { border: 1px solid #e0e0e0; border-radius: 6px; margin: 0.75rem 0; padding: 0.5rem; }
.filter-rail label { display: block; font-size: 0.85rem; margin: 2px 0; }
.filter-rail select { width: 100%; margin-top: 4px; }

.kpi-row { display: flex; gap: 0.75rem; }
.kpi-card {
  flex: 1;
  background: #fff;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kpi-value { font-size: 1.5rem; font-weight: 700; color: #1e3a5f; }
.kpi-label { font-size: 0.78rem; color: #5a6b7d; }

.chart-grid { display: flex; flex-direction: column; gap: 1rem; }
.chart-card { background: #fff; border: 1px solid #d4d4d8; border-radius: 8px; }
.chart-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #eee;
}
.chart-card-head h3 { margin: 0; font-size: 0.95rem; }
.chart-card-body { padding: 0.75rem; }
.freshness-badge { font-size: 0.72rem; color: #5a6b7d; }
.state-msg { color: #5a6b7d; font-size: 0.85rem; padding: 1rem; text-align: center; }
.state-error { color: #aa2e4a; }
```

- [ ] **Step 3: Verify no test regressions**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/ChartGrid.jsx src/dashboard/dashboard.css
git commit -m "feat: chart grid and dashboard layout styles"
```

---

## Task 20: DashboardPage assembly

**Files:**
- Create: `src/dashboard/DashboardPage.jsx`
- Create: `src/dashboard/useDatasets.js`
- Test: `src/__tests__/dashboard/useDatasets.test.js`

`useDatasets` loads every registry entry for a domaine and tracks per-dataset status. `DashboardPage` wires everything into layout B.

- [ ] **Step 1: Write the failing test for useDatasets**

```js
// src/__tests__/dashboard/useDatasets.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDatasets } from '../../dashboard/useDatasets'
import * as loader from '../../datasets/loadDataset'

describe('useDatasets', () => {
  beforeEach(() => vi.spyOn(loader, 'loadDataset'))
  afterEach(() => vi.restoreAllMocks())

  it('loads every entry and marks each ready', async () => {
    loader.loadDataset.mockResolvedValue({ features: [{ properties: {} }] })
    const entries = [
      { id: 'a', libelle: 'A', dateField: null },
      { id: 'b', libelle: 'B', dateField: null },
    ]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.dataset.features).toHaveLength(1)
  })

  it('marks a failed entry as erreur without affecting the others', async () => {
    loader.loadDataset.mockImplementation((entry) =>
      entry.id === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve({ features: [] }))
    const entries = [
      { id: 'a', libelle: 'A', dateField: null },
      { id: 'b', libelle: 'B', dateField: null },
    ]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('erreur'))
    expect(result.current.b.status).toBe('pret')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/dashboard/useDatasets.test.js`
Expected: FAIL — cannot resolve `../../dashboard/useDatasets`.

- [ ] **Step 3: Write useDatasets**

```js
// src/dashboard/useDatasets.js
import { useState, useEffect } from 'react'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine. Renvoie un objet { [id]: { status, dataset, error } }.
// status ∈ 'chargement' | 'pret' | 'erreur'.
export function useDatasets(entries) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null }])))

  useEffect(() => {
    let cancelled = false
    setStates(Object.fromEntries(
      entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null }])))
    for (const entry of entries) {
      loadDataset(entry)
        .then((dataset) => {
          if (cancelled) return
          setStates((prev) => ({ ...prev, [entry.id]: { status: 'pret', dataset, error: null } }))
        })
        .catch((err) => {
          if (cancelled) return
          setStates((prev) => ({ ...prev, [entry.id]: { status: 'erreur', dataset: null, error: err.message } }))
        })
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join(',')])

  return states
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/dashboard/useDatasets.test.js`
Expected: PASS — 2 tests.

- [ ] **Step 5: Write DashboardPage**

```jsx
// src/dashboard/DashboardPage.jsx
import { useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { DOMAINES } from '../datasets/schema'
import { entriesForDomaine } from '../datasets/registry'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { useDatasets } from './useDatasets'
import { selectDatasets, filterFeatures } from './filtering'
import { datasetDate, oldestDate } from './freshness'
import TopBar from './TopBar'
import FilterRail from './FilterRail'
import KpiRow from './KpiRow'
import ChartGrid from './ChartGrid'
import DashboardMap from './DashboardMap'
import './dashboard.css'

function DashboardInner({ domaine }) {
  const { state } = useDashboard()
  const entries = useMemo(() => entriesForDomaine(domaine), [domaine])
  const datasetStates = useDatasets(entries)

  // Étape 1 : filtre catégorie + mode + temporel → quels jeux.
  const activeEntries = useMemo(
    () => selectDatasets(entries, state.filters),
    [entries, state.filters],
  )

  // Étape 2 : filtre géographique → quelles features par jeu.
  const activeLayers = useMemo(() => {
    return activeEntries
      .map((entry) => {
        const ds = datasetStates[entry.id]
        if (!ds || ds.status !== 'pret') return null
        const features = filterFeatures(ds.dataset.features, state.filters)
        return { id: entry.id, libelle: entry.libelle, entry, dataset: ds.dataset, features }
      })
      .filter(Boolean)
  }, [activeEntries, datasetStates, state.filters])

  // Options des filtres dérivées des jeux chargés.
  const filterOptions = useMemo(() => {
    const categories = [...new Set(entries.map((e) => e.categorie))].sort()
    const modes = [...new Set(entries.flatMap((e) => e.mode))].sort()
    const annees = [...new Set(entries.map((e) => e.millesime).filter((m) => m != null))].sort()
    const zones = [...new Set(
      Object.values(datasetStates)
        .filter((d) => d.status === 'pret')
        .flatMap((d) => d.dataset.features.map((f) => f.properties?.commune))
        .filter(Boolean),
    )].sort()
    return { categories, modes, annees, zones }
  }, [entries, datasetStates])

  const kpis = useMemo(() => [
    { label: 'Jeux actifs', value: activeLayers.length },
    { label: 'Features affichées', value: activeLayers.reduce((n, l) => n + l.features.length, 0) },
    {
      label: 'Données chargées',
      value: `${Object.values(datasetStates).filter((d) => d.status === 'pret').length}/${entries.length}`,
    },
  ], [activeLayers, datasetStates, entries.length])

  const charts = useMemo(() => [{
    key: 'features-par-jeu',
    title: 'Nombre de features par jeu de données',
    status: activeLayers.length === 0 ? 'vide' : 'pret',
    date: oldestDate(activeLayers.map((l) => datasetDate(l.entry, l.dataset))),
    type: 'features-par-jeu',
    data: activeLayers.map((l) => ({ libelle: l.libelle, count: l.features.length })),
  }], [activeLayers])

  const globalOldest = useMemo(
    () => oldestDate(activeLayers.map((l) => datasetDate(l.entry, l.dataset))),
    [activeLayers],
  )

  const empty = entries.length === 0

  return (
    <div className="dashboard">
      <TopBar domaine={domaine} oldestDate={globalOldest} />
      <div className="dashboard-body">
        <div className="dashboard-map">
          {empty
            ? <p className="state-msg">Aucune source configurée pour ce domaine — en attente des identifiants DataHub.</p>
            : <DashboardMap layers={activeLayers} />}
        </div>
        <div className="dashboard-analytics">
          {empty
            ? <p className="state-msg">Aucun indicateur disponible : ce domaine n'a pas encore de jeu de données.</p>
            : <>
                <KpiRow kpis={kpis} />
                <ChartGrid charts={charts} />
              </>}
        </div>
        <FilterRail options={filterOptions} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { domaine } = useParams()
  if (!DOMAINES.includes(domaine)) return <Navigate to="/dashboard/mobilite" replace />
  // key force le remontage (et la réinitialisation du reducer) au changement de domaine.
  return (
    <DashboardProvider key={domaine} domaine={domaine}>
      <DashboardInner domaine={domaine} />
    </DashboardProvider>
  )
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every test including `App.test.jsx` (which mocks `DashboardPage`).

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/DashboardPage.jsx src/dashboard/useDatasets.js src/__tests__/dashboard/useDatasets.test.js
git commit -m "feat: assemble dashboard page with layout B"
```

---

## Task 21: Lint, build and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all tests green, no unhandled errors.

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: no errors. Fix any reported issue in the files above (unused imports, missing deps) and re-run.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds, no unresolved imports.

- [ ] **Step 4: Manual verification in the browser**

Run: `npm run dev`, open the served URL. Confirm:
- `/` redirects to `/dashboard/mobilite`.
- Layout B: map on the left, KPIs + bar chart in the centre column, filter rail on the right.
- The three seed datasets (Arrêts, Carrefours, VCub) load; their points appear on the map; KPIs and the bar chart show non-zero counts.
- Toggling a **catégorie** or **mode** filter removes/adds datasets from the map and chart.
- The **Stationnement** toggle switches to a shell showing the empty-state messages.
- The **Mode Live →** link opens `/live` with the original real-time map unchanged.
- Each chart card shows a date badge (or "date inconnue" if the seed datasets lack the `mdate` field).

If the seed datasets' real date field differs from `mdate`, note the correct field name; it will be corrected when the full dataset list is integrated.

- [ ] **Step 5: Commit any lint/build fixes**

```bash
git add -A
git commit -m "chore: lint and build fixes for dashboard foundation"
```

(If Steps 1-3 needed no fixes, skip this commit.)

---

## Follow-up (separate plan)

Once the user supplies the DataHub identifiers/URLs for the remaining 22 datasets
and the administrative-contours source, a second plan will:

- add the 22 registry entries (mechanical, one entry each);
- replace property-based geographic filtering with point-in-polygon matching
  against the contours dataset;
- add domain-specific charts (time series for traffic counts, 2019-vs-current
  comparisons for alternative mobility, parking pricing comparisons);
- refine the `categorie` / `mode` tagging from the real dataset schemas.
