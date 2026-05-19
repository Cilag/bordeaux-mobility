# Dashboard — Intégration des jeux de données (plan de suivi)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter la couche de données du dashboard Mobilité & Stationnement — ajouter un second loader (API Opendatasoft) à côté du loader WFS existant, intégrer les ~24 jeux de données identifiés dans le catalogue de Bordeaux Métropole, et remplacer le filtrage géographique par propriété par un vrai filtrage point-dans-polygone basé sur les contours administratifs.

**Architecture :** Le registre déclaratif (`src/datasets/registry.js`) gagne un second `source.type` (`opendatasoft`) ; `buildUrl`/`loadDataset` est étendu pour le router vers le bon endpoint. Le filtrage géographique charge un jeu de contours (`FV_COMMU_S`, `SE_QUART_S`) et rattache chaque feature à une zone par test point-dans-polygone. Les jeux non géométriques (tables d'attributs) sont marqués `geometrie: null` et alimentent les KPIs sans couche carte.

**Tech Stack :** React 19, Vite, Leaflet/react-leaflet, Recharts, Vitest. Aucune nouvelle dépendance.

**Prérequis :** la fondation (plan `2026-05-16-dashboard-mobilite-stationnement-foundation.md`) est mergée ou présente sur la branche. Clé `VITE_DATAHUB_API_KEY` présente dans `.env` (déjà le cas).

**Périmètre :** ce plan livre la couche de données complète (loaders + registre + filtrage géographique réel). Les **diagrammes analytiques spécifiques par domaine** (séries temporelles de comptage, comparaison mobilité alternative, tarifs parkings) font l'objet d'un plan ultérieur, car leur conception dépend du relevé de schéma produit par la Tâche 1.

---

## Identifiants DataHub de référence (issus de la recherche catalogue)

**Couches WFS** — endpoint `geojson/features/{ID}` (loader `datahub-geojson`, clé requise) :

| Jeu | ID | Géom. attendue | Domaine |
|---|---|---|---|
| Capteurs trafic piéton | `PC_CAPTP_P` | point | mobilite |
| Capteurs trafic routier ponctuel | `PC_CAPTE_PONCT_P` | point | mobilite |
| Capteurs trafic vélo | `PC_CAPTV_P` | point | mobilite |
| Couloirs de bus | `SV_COULOIR_L` | ligne | mobilite |
| Déviations programmées | `SV_DEVIA_L` | ligne | mobilite |
| Emplacements freefloating | `ST_FREEFLOATING_S` | polygone | mobilite |
| Emprises chantiers | `CI_EMPRISE_A` | à vérifier (table) | mobilite |
| Événements circulation | `CI_EVENMT_P` | point | mobilite |
| Lignes commerciales | `SV_LIGNE_A` | table (sans géom.) | mobilite |
| Lieux desservis par arrêts | `SV_LIPUB_A` | table (sans géom.) | mobilite |
| Filaire de voirie | `FV_TRONC_L` | ligne | mobilite |
| Points d'accès autopartage | `ST_AUTOPARTAGE_P` | point | mobilite |
| Bornes de charge IRVE | `ST_IRVE_PDC_P` | point | mobilite |
| Parkings hors voirie | `ST_PARK_P` | point | stationnement |
| Emplacements 2-roues motorisés | `ST_EMPLACEMENT_2ROUES_P` | point | stationnement |
| Places PMR | `GRS_GIGC_P` | point | stationnement |
| Voies en stationnement payant | `bor_sigstapayant` | ligne | stationnement |

**Datasets Opendatasoft** — endpoint `opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/{id}/exports/geojson` (loader `opendatasoft`, sans clé) :

| Jeu | dataset_id | Domaine |
|---|---|---|
| Comptage du trafic | `comptage-du-trafic-2025-bordeaux-metropole` | mobilite |
| Mobilité alternative 2019 | `places-de-covoiturage-sur-et-hors-voirie` | mobilite |
| Offres bus/tram/scolaire (GTFS) | `offres-de-services-bus-tramway-gtfs` | mobilite |
| Schéma directeur IRVE | `met_sdirve` | mobilite |
| Véhicules en autopartage | `met_vehicule-station-autopartage-tr` | mobilite |
| Accidents corporels de la circulation 2012-2019 | `accidents-corporels-de-la-circulation-sur-bordeaux-metropole-2012-2019` | mobilite |
| Parkings données techniques | `parkings-donnees-techniques-2026-mars` | stationnement |
| Parkings tarifs | `parkings-tarifs-2025-fevrier` | stationnement |

**Contours administratifs :** `FV_COMMU_S` (communes, polygones), `SE_QUART_S` (quartiers, polygones).

**Notes :** « Mobilité alternative » millésime courant n'existe pas (seul 2019). « Offres bus/tram GTFS » est un bundle de flux, pas une FeatureCollection — la Tâche 1 confirmera s'il est exploitable comme jeu de données ou doit être exclu.

---

## File Structure

**Modifiés :**
- `src/datasets/schema.js` — ajout des constantes de `source.type` et validation
- `src/datasets/loadDataset.js` — `buildUrl` route WFS vs Opendatasoft
- `src/datasets/registry.js` — passe de 3 à ~24 entrées
- `src/dashboard/filtering.js` — `filterFeatures` accepte un résolveur de zone
- `src/dashboard/DashboardPage.jsx` — charge les contours, passe le résolveur de zone

**Créés :**
- `src/dashboard/geo.js` — `pointInPolygon`, `featureCentroid`, `resolveZone`
- `src/dashboard/useContours.js` — hook de chargement des contours administratifs
- `docs/superpowers/research/2026-05-16-datasets-inventory.md` — sortie de la Tâche 1
- Tests sous `src/__tests__/`

---

## Task 1: Relevé technique des endpoints (spike)

**But :** établir les faits avant de figer le registre. Aucun code applicatif — produit un document d'inventaire.

**Files:**
- Create: `docs/superpowers/research/2026-05-16-datasets-inventory.md`

- [ ] **Step 1 : Tester chaque endpoint WFS.**

Pour chaque ID WFS du tableau ci-dessus, faire une requête (la clé est dans `.env`, variable `VITE_DATAHUB_API_KEY`) :
`https://data.bordeaux-metropole.fr/geojson/features/{ID}?key={CLE}&maxfeatures=1`
Noter : HTTP OK/échec ; `geometry.type` de la première feature (Point/LineString/Polygon/Multi*) ou `null` si table sans géométrie ; les clés de `properties` ; tout champ ressemblant à une date de mise à jour (`mdate`, `gid`, `date_*`).

- [ ] **Step 2 : Tester chaque dataset Opendatasoft.**

Pour chaque `dataset_id` Opendatasoft :
`https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/{dataset_id}/exports/geojson` (limiter via `?limit=1` sur `/records` si l'export est trop volumineux).
Noter : HTTP OK/échec ; présence de géométrie ; champs disponibles ; pour `comptage-du-trafic-*` noter les champs de date et de mesure (c'est la source des séries temporelles) ; pour `offres-de-services-bus-tramway-gtfs` déterminer si exploitable ou à exclure.

- [ ] **Step 3 : Tester les contours.**

`FV_COMMU_S` et `SE_QUART_S` via le endpoint WFS. Noter le champ portant le nom de commune / quartier (ex. `commune`, `nom`, `libelle`).

- [ ] **Step 4 : Rédiger l'inventaire.**

Écrire `docs/superpowers/research/2026-05-16-datasets-inventory.md` : un tableau par jeu avec `id | endpoint OK | geometrie réelle | champ date | champ zone éventuel | champs clés | décision (intégrer / table-only / exclure)`.

- [ ] **Step 5 : Commit.**

```bash
git add docs/superpowers/research/2026-05-16-datasets-inventory.md
git commit -m "research: datasets endpoint inventory for dashboard integration"
```

**Sortie attendue :** un inventaire factuel. Les Tâches 5-7 (entrées de registre) s'appuient dessus pour fixer `geometrie` et `dateField` ; tout jeu marqué « exclure » n'est pas ajouté au registre.

---

## Task 2: Constantes de type de source

**Files:**
- Modify: `src/datasets/schema.js`
- Test: `src/__tests__/datasets/schema.test.js` (étendre)

- [ ] **Step 1 : Écrire le test d'échec.** Ajouter au fichier de test existant :

```js
import { SOURCE_TYPES } from '../../datasets/schema'

describe('schema — source types', () => {
  it('expose les types de source supportés', () => {
    expect(SOURCE_TYPES).toEqual(['datahub-geojson', 'opendatasoft'])
  })

  it('rejette un type de source inconnu', () => {
    const e = { ...valid, source: { type: 'ftp', datahubId: 'X' } }
    expect(validateEntry(e)).toContain('source.type invalide: ftp')
  })

  it('accepte une source opendatasoft', () => {
    const e = { ...valid, source: { type: 'opendatasoft', datasetId: 'comptage-du-trafic-2025-bordeaux-metropole' } }
    expect(validateEntry(e)).toEqual([])
  })

  it('autorise geometrie null pour une table sans géométrie', () => {
    expect(validateEntry({ ...valid, geometrie: null })).toEqual([])
  })
})
```

- [ ] **Step 2 : Vérifier l'échec.** `npx vitest run src/__tests__/datasets/schema.test.js` → FAIL.

- [ ] **Step 3 : Implémenter.** Dans `src/datasets/schema.js` :

```js
export const SOURCE_TYPES = ['datahub-geojson', 'opendatasoft']
```

Dans `validateEntry`, remplacer le contrôle de `geometrie` pour autoriser `null`, et ajouter le contrôle de source :

```js
  if (entry.geometrie !== null && !GEOMETRIES.includes(entry.geometrie)) {
    errors.push(`geometrie invalide: ${entry.geometrie}`)
  }
  if (!entry.source || !SOURCE_TYPES.includes(entry.source.type)) {
    errors.push(`source.type invalide: ${entry.source?.type}`)
  }
```

- [ ] **Step 4 : Vérifier le succès.** `npx vitest run src/__tests__/datasets/schema.test.js` → PASS.

- [ ] **Step 5 : Commit.**

```bash
git add src/datasets/schema.js src/__tests__/datasets/schema.test.js
git commit -m "feat: schema supports opendatasoft source type and null geometry"
```

---

## Task 3: Loader multi-source (WFS + Opendatasoft)

**Files:**
- Modify: `src/datasets/loadDataset.js`
- Test: `src/__tests__/datasets/loadDataset.test.js` (étendre)

- [ ] **Step 1 : Écrire les tests d'échec.** Ajouter :

```js
it('construit l\'URL Opendatasoft depuis datasetId', async () => {
  const entry = { id: 'comptage', source: { type: 'opendatasoft', datasetId: 'comptage-du-trafic-2025-bordeaux-metropole' } }
  const fetchImpl = fakeFetch({ features: [] })
  await loadDataset(entry, { fetchImpl })
  expect(fetchImpl.mock.calls[0][0])
    .toContain('/api/opendata/api/explore/v2.1/catalog/datasets/comptage-du-trafic-2025-bordeaux-metropole/exports/geojson')
})

it('rejette un type de source inconnu', async () => {
  const entry = { id: 'x', source: { type: 'ftp' } }
  await expect(loadDataset(entry, { fetchImpl: fakeFetch({}) }))
    .rejects.toThrow('type de source non supporté: ftp')
})
```

- [ ] **Step 2 : Vérifier l'échec.** `npx vitest run src/__tests__/datasets/loadDataset.test.js` → FAIL sur le test Opendatasoft.

- [ ] **Step 3 : Implémenter.** Dans `src/datasets/loadDataset.js`, remplacer `buildUrl` :

```js
function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}?key=${DATAHUB_KEY}`
  }
  if (source.type === 'opendatasoft') {
    return `/api/opendata/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}
```

- [ ] **Step 4 : Ajouter le proxy Vite.** Dans `vite.config.js`, ajouter sous `server.proxy` :

```js
      '/api/opendata': {
        target: 'https://opendata.bordeaux-metropole.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opendata/, ''),
      },
```

- [ ] **Step 5 : Vérifier le succès.** `npx vitest run src/__tests__/datasets/loadDataset.test.js` → PASS.

- [ ] **Step 6 : Commit.**

```bash
git add src/datasets/loadDataset.js vite.config.js src/__tests__/datasets/loadDataset.test.js
git commit -m "feat: loader routes WFS and Opendatasoft sources"
```

---

## Task 4: Utilitaire géométrique point-dans-polygone

**Files:**
- Create: `src/dashboard/geo.js`
- Test: `src/__tests__/dashboard/geo.test.js`

- [ ] **Step 1 : Écrire le test d'échec.** Créer `src/__tests__/dashboard/geo.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { pointInRing, featurePoint, resolveZone } from '../../dashboard/geo'

const carre = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]] // [lon, lat]

describe('pointInRing', () => {
  it('détecte un point intérieur', () => {
    expect(pointInRing([5, 5], carre)).toBe(true)
  })
  it('détecte un point extérieur', () => {
    expect(pointInRing([15, 5], carre)).toBe(false)
  })
})

describe('featurePoint', () => {
  it('retourne les coordonnées d\'une feature Point', () => {
    expect(featurePoint({ geometry: { type: 'Point', coordinates: [3, 4] } })).toEqual([3, 4])
  })
  it('retourne le premier sommet d\'une LineString', () => {
    expect(featurePoint({ geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] } })).toEqual([1, 2])
  })
  it('retourne null sans géométrie', () => {
    expect(featurePoint({ geometry: null })).toBeNull()
  })
})

describe('resolveZone', () => {
  const zones = [
    { nom: 'A', geometry: { type: 'Polygon', coordinates: [carre] } },
    { nom: 'B', geometry: { type: 'Polygon', coordinates: [[[20, 20], [20, 30], [30, 30], [30, 20], [20, 20]]] } },
  ]
  it('rattache une feature à la bonne zone', () => {
    const f = { geometry: { type: 'Point', coordinates: [5, 5] } }
    expect(resolveZone(f, zones, 'nom')).toBe('A')
  })
  it('retourne null hors de toute zone', () => {
    const f = { geometry: { type: 'Point', coordinates: [50, 50] } }
    expect(resolveZone(f, zones, 'nom')).toBeNull()
  })
})
```

- [ ] **Step 2 : Vérifier l'échec.** `npx vitest run src/__tests__/dashboard/geo.test.js` → FAIL.

- [ ] **Step 3 : Implémenter.** Créer `src/dashboard/geo.js` :

```js
// Test point-dans-anneau par lancer de rayon. point et ring en [lon, lat].
export function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Point représentatif d'une feature (coordonnée pour Point, premier sommet sinon).
export function featurePoint(feature) {
  const g = feature?.geometry
  if (!g) return null
  if (g.type === 'Point') return g.coordinates
  if (g.type === 'LineString') return g.coordinates[0]
  if (g.type === 'MultiLineString' || g.type === 'Polygon') return g.coordinates[0][0]
  if (g.type === 'MultiPolygon') return g.coordinates[0][0][0]
  return null
}

// Premier anneau extérieur d'une zone (Polygon ou MultiPolygon).
function outerRings(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((p) => p[0])
  return []
}

// Nom de la zone contenant la feature, ou null.
export function resolveZone(feature, zones, nameField) {
  const pt = featurePoint(feature)
  if (!pt) return null
  for (const zone of zones) {
    if (outerRings(zone.geometry).some((ring) => pointInRing(pt, ring))) {
      return zone[nameField] ?? zone.properties?.[nameField] ?? null
    }
  }
  return null
}
```

- [ ] **Step 4 : Vérifier le succès.** `npx vitest run src/__tests__/dashboard/geo.test.js` → PASS.

- [ ] **Step 5 : Commit.**

```bash
git add src/dashboard/geo.js src/__tests__/dashboard/geo.test.js
git commit -m "feat: point-in-polygon geo utilities"
```

---

## Task 5: Filtrage géographique par zone

**Files:**
- Modify: `src/dashboard/filtering.js`
- Test: `src/__tests__/dashboard/filtering.test.js` (étendre)

`filterFeatures` filtre actuellement sur la propriété `commune`. On le rend capable d'utiliser un résolveur de zone (point-dans-polygone) tout en gardant le repli sur la propriété.

- [ ] **Step 1 : Écrire le test d'échec.** Ajouter :

```js
describe('filterFeatures — résolveur de zone', () => {
  const features = [
    { geometry: { type: 'Point', coordinates: [5, 5] } },
    { geometry: { type: 'Point', coordinates: [50, 50] } },
  ]
  it('utilise le résolveur quand il est fourni', () => {
    const resolver = (f) => (f.geometry.coordinates[0] === 5 ? 'Bordeaux' : 'Pessac')
    const r = filterFeatures(features, { zone: 'Bordeaux' }, resolver)
    expect(r).toHaveLength(1)
    expect(r[0].geometry.coordinates).toEqual([5, 5])
  })
})
```

- [ ] **Step 2 : Vérifier l'échec.** `npx vitest run src/__tests__/dashboard/filtering.test.js` → FAIL.

- [ ] **Step 3 : Implémenter.** Remplacer `filterFeatures` dans `src/dashboard/filtering.js` :

```js
// Étape 2 (géographique). zoneResolver(feature) -> nom de zone | null.
// Sans résolveur, repli sur la propriété `commune`.
export function filterFeatures(features, filters, zoneResolver = null) {
  const { zone = null } = filters
  if (!zone) return features
  if (zoneResolver) {
    return features.filter((f) => zoneResolver(f) === zone)
  }
  return features.filter((f) => (f.properties?.commune ?? null) === zone)
}
```

- [ ] **Step 4 : Vérifier le succès.** `npx vitest run src/__tests__/dashboard/filtering.test.js` → PASS (tous les tests existants restent verts : la signature est rétro-compatible).

- [ ] **Step 5 : Commit.**

```bash
git add src/dashboard/filtering.js src/__tests__/dashboard/filtering.test.js
git commit -m "feat: geographic filtering via zone resolver"
```

---

## Task 6: Hook de chargement des contours

**Files:**
- Create: `src/dashboard/useContours.js`
- Test: `src/__tests__/dashboard/useContours.test.js`

Charge `FV_COMMU_S` (communes) via `loadDataset` et expose `{ zones, nameField, resolver }`. `nameField` est le champ portant le nom de commune, déterminé par la Tâche 1 (placeholder `'commune'` ci-dessous — l'implémenteur le remplace par la valeur réelle de l'inventaire).

- [ ] **Step 1 : Écrire le test d'échec.** Créer `src/__tests__/dashboard/useContours.test.js` :

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useContours } from '../../dashboard/useContours'
import * as loader from '../../datasets/loadDataset'

describe('useContours', () => {
  beforeEach(() => vi.spyOn(loader, 'loadDataset'))
  afterEach(() => vi.restoreAllMocks())

  it('charge les contours et expose la liste des zones triée', async () => {
    loader.loadDataset.mockResolvedValue({ features: [
      { properties: { commune: 'Pessac' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[0,0]]] } },
      { properties: { commune: 'Bordeaux' }, geometry: { type: 'Polygon', coordinates: [[[2,2],[2,3],[3,3],[2,2]]] } },
    ] })
    const { result } = renderHook(() => useContours())
    await waitFor(() => expect(result.current.zones).toHaveLength(2))
    expect(result.current.zoneNames).toEqual(['Bordeaux', 'Pessac'])
  })

  it('expose un résolveur fonctionnel', async () => {
    loader.loadDataset.mockResolvedValue({ features: [
      { properties: { commune: 'Bordeaux' }, geometry: { type: 'Polygon', coordinates: [[[0,0],[0,10],[10,10],[10,0],[0,0]]] } },
    ] })
    const { result } = renderHook(() => useContours())
    await waitFor(() => expect(result.current.zones).toHaveLength(1))
    expect(result.current.resolver({ geometry: { type: 'Point', coordinates: [5, 5] } })).toBe('Bordeaux')
  })
})
```

- [ ] **Step 2 : Vérifier l'échec.** `npx vitest run src/__tests__/dashboard/useContours.test.js` → FAIL.

- [ ] **Step 3 : Implémenter.** Créer `src/dashboard/useContours.js`. Remplacer `COMMUNE_FIELD` par le champ réel relevé en Tâche 1 :

```js
import { useState, useEffect, useMemo } from 'react'
import { loadDataset } from '../datasets/loadDataset'
import { resolveZone } from './geo'

const CONTOURS_ENTRY = {
  id: 'contours-communes',
  source: { type: 'datahub-geojson', datahubId: 'FV_COMMU_S' },
}
const COMMUNE_FIELD = 'commune' // ← valeur à confirmer via l'inventaire Tâche 1

export function useContours() {
  const [zones, setZones] = useState([])

  useEffect(() => {
    let cancelled = false
    loadDataset(CONTOURS_ENTRY)
      .then((ds) => { if (!cancelled) setZones(ds.features ?? []) })
      .catch(() => { if (!cancelled) setZones([]) })
    return () => { cancelled = true }
  }, [])

  const zoneNames = useMemo(
    () => [...new Set(zones.map((z) => z.properties?.[COMMUNE_FIELD]).filter(Boolean))].sort(),
    [zones],
  )

  const resolver = useMemo(
    () => (feature) => resolveZone(feature, zones.map((z) => ({
      geometry: z.geometry, [COMMUNE_FIELD]: z.properties?.[COMMUNE_FIELD],
    })), COMMUNE_FIELD),
    [zones],
  )

  return { zones, zoneNames, resolver }
}
```

- [ ] **Step 4 : Vérifier le succès.** `npx vitest run src/__tests__/dashboard/useContours.test.js` → PASS.

- [ ] **Step 5 : Commit.**

```bash
git add src/dashboard/useContours.js src/__tests__/dashboard/useContours.test.js
git commit -m "feat: administrative contours loading hook"
```

---

## Task 7: Registre — jeux Mobilité

**Files:**
- Modify: `src/datasets/registry.js`
- Test: `src/__tests__/datasets/registry.test.js` (le test générique « toute entrée est valide » couvre les nouvelles entrées)

- [ ] **Step 1 : Ajouter les entrées Mobilité.** Conserver les 3 entrées existantes, ajouter les entrées ci-dessous au tableau `REGISTRY`. Pour chaque entrée, `geometrie` et `dateField` doivent être confirmés/corrigés d'après l'inventaire Tâche 1 ; un jeu marqué « table-only » dans l'inventaire prend `geometrie: null` et `viz: ['kpi-comptage']` (sans `'carte'`) ; un jeu marqué « exclure » n'est pas ajouté.

```js
  {
    id: 'capteurs-pieton', domaine: 'mobilite', libelle: 'Capteurs de trafic piéton',
    source: { type: 'datahub-geojson', datahubId: 'PC_CAPTP_P' },
    geometrie: 'point', mode: ['pieton'], categorie: 'capteurs',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'capteurs-routier', domaine: 'mobilite', libelle: 'Capteurs de trafic routier ponctuel',
    source: { type: 'datahub-geojson', datahubId: 'PC_CAPTE_PONCT_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'capteurs',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'capteurs-velo', domaine: 'mobilite', libelle: 'Capteurs de trafic vélo',
    source: { type: 'datahub-geojson', datahubId: 'PC_CAPTV_P' },
    geometrie: 'point', mode: ['velo'], categorie: 'capteurs',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'couloirs-bus', domaine: 'mobilite', libelle: 'Couloirs de bus',
    source: { type: 'datahub-geojson', datahubId: 'SV_COULOIR_L' },
    geometrie: 'ligne', mode: ['bus_tram'], categorie: 'reseau-bus',
    dateField: 'mdate', millesime: null, viz: ['carte'],
  },
  {
    id: 'deviations', domaine: 'mobilite', libelle: 'Déviations programmées',
    source: { type: 'datahub-geojson', datahubId: 'SV_DEVIA_L' },
    geometrie: 'ligne', mode: ['bus_tram'], categorie: 'perturbations',
    dateField: 'mdate', millesime: null, viz: ['carte'],
  },
  {
    id: 'freefloating', domaine: 'mobilite', libelle: 'Emplacements freefloating',
    source: { type: 'datahub-geojson', datahubId: 'ST_FREEFLOATING_S' },
    geometrie: 'polygone', mode: ['freefloating'], categorie: 'freefloating',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'evenements-circulation', domaine: 'mobilite', libelle: 'Événements impactant la circulation',
    source: { type: 'datahub-geojson', datahubId: 'CI_EVENMT_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'perturbations',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'filaire-voirie', domaine: 'mobilite', libelle: 'Filaire de voirie',
    source: { type: 'datahub-geojson', datahubId: 'FV_TRONC_L' },
    geometrie: 'ligne', mode: ['voiture'], categorie: 'voirie',
    dateField: 'mdate', millesime: null, viz: ['carte'],
  },
  {
    id: 'autopartage-acces', domaine: 'mobilite', libelle: 'Points d\'accès autopartage',
    source: { type: 'datahub-geojson', datahubId: 'ST_AUTOPARTAGE_P' },
    geometrie: 'point', mode: ['autopartage'], categorie: 'autopartage',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'irve-bornes', domaine: 'mobilite', libelle: 'Bornes de charge IRVE',
    source: { type: 'datahub-geojson', datahubId: 'ST_IRVE_PDC_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'irve',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'comptage-trafic', domaine: 'mobilite', libelle: 'Comptage du trafic',
    source: { type: 'opendatasoft', datasetId: 'comptage-du-trafic-2025-bordeaux-metropole' },
    geometrie: 'point', mode: ['voiture'], categorie: 'comptage',
    dateField: 'mdate', millesime: 2025, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'mobilite-alternative-2019', domaine: 'mobilite', libelle: 'Mobilité alternative 2019',
    source: { type: 'opendatasoft', datasetId: 'places-de-covoiturage-sur-et-hors-voirie' },
    geometrie: 'point', mode: ['autopartage'], categorie: 'mobilite-alternative',
    dateField: 'mdate', millesime: 2019, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'irve-schema-directeur', domaine: 'mobilite', libelle: 'Schéma directeur IRVE',
    source: { type: 'opendatasoft', datasetId: 'met_sdirve' },
    geometrie: 'point', mode: ['voiture'], categorie: 'irve',
    dateField: 'mdate', millesime: null, viz: ['carte'],
  },
  {
    id: 'accidents-corporels', domaine: 'mobilite', libelle: 'Accidents corporels de la circulation 2012-2019',
    source: { type: 'opendatasoft', datasetId: 'accidents-corporels-de-la-circulation-sur-bordeaux-metropole-2012-2019' },
    geometrie: 'point', mode: ['voiture', 'velo', 'pieton'], categorie: 'securite',
    dateField: 'datetime', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
```

Note Tâche 1 : le jeu « accidents corporels » porte ~12 000 enregistrements avec un champ géo `coordonnees` (certains nuls) et un champ de gravité `grav` — confirmer via l'inventaire que l'export GeoJSON produit bien des features `Point` et noter le champ de date exact (`datetime` ou `an`).

Entrées dépendantes de l'inventaire (Tâche 1) — à ajouter seulement si confirmées exploitables, sinon documenter l'exclusion : `chantiers` (`CI_EMPRISE_A`), `lignes-commerciales` (`SV_LIGNE_A`), `lieux-desservis` (`SV_LIPUB_A`), `offres-services` (`offres-de-services-bus-tramway-gtfs`), `vehicules-autopartage` (`met_vehicule-station-autopartage-tr`).

- [ ] **Step 2 : Vérifier.** `npx vitest run src/__tests__/datasets/registry.test.js` → PASS (validation schéma + pas d'id dupliqué).

- [ ] **Step 3 : Commit.**

```bash
git add src/datasets/registry.js
git commit -m "feat: register mobilité datasets"
```

---

## Task 8: Registre — jeux Stationnement

**Files:**
- Modify: `src/datasets/registry.js`
- Test: `src/__tests__/datasets/registry.test.js`

- [ ] **Step 1 : Ajouter les entrées Stationnement** (mêmes règles : `geometrie`/`dateField` confirmés via Tâche 1) :

```js
  {
    id: 'parkings-hors-voirie', domaine: 'stationnement', libelle: 'Parkings hors voirie',
    source: { type: 'datahub-geojson', datahubId: 'ST_PARK_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'parking-ouvrage',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'emplacements-2roues', domaine: 'stationnement', libelle: 'Emplacements 2-roues motorisés',
    source: { type: 'datahub-geojson', datahubId: 'ST_EMPLACEMENT_2ROUES_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'parking-2roues',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'places-pmr', domaine: 'stationnement', libelle: 'Places de stationnement PMR',
    source: { type: 'datahub-geojson', datahubId: 'GRS_GIGC_P' },
    geometrie: 'point', mode: ['voiture'], categorie: 'parking-pmr',
    dateField: 'mdate', millesime: null, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'stationnement-payant', domaine: 'stationnement', libelle: 'Voies en stationnement payant',
    source: { type: 'datahub-geojson', datahubId: 'bor_sigstapayant' },
    geometrie: 'ligne', mode: ['voiture'], categorie: 'parking-payant',
    dateField: 'mdate', millesime: null, viz: ['carte'],
  },
  {
    id: 'parkings-techniques', domaine: 'stationnement', libelle: 'Parkings — données techniques',
    source: { type: 'opendatasoft', datasetId: 'parkings-donnees-techniques-2026-mars' },
    geometrie: 'point', mode: ['voiture'], categorie: 'parking-ouvrage',
    dateField: 'mdate', millesime: 2026, viz: ['carte', 'kpi-comptage'],
  },
  {
    id: 'parkings-tarifs', domaine: 'stationnement', libelle: 'Parkings — tarifs',
    source: { type: 'opendatasoft', datasetId: 'parkings-tarifs-2025-fevrier' },
    geometrie: null, mode: ['voiture'], categorie: 'parking-tarifs',
    dateField: 'mdate', millesime: 2025, viz: ['kpi-comptage'],
  },
```

- [ ] **Step 2 : Vérifier.** `npx vitest run src/__tests__/datasets/registry.test.js` → PASS.

- [ ] **Step 3 : Commit.**

```bash
git add src/datasets/registry.js
git commit -m "feat: register stationnement datasets"
```

---

## Task 9: Câblage des contours et du filtrage géo dans DashboardPage

**Files:**
- Modify: `src/dashboard/DashboardPage.jsx`
- Test: vérification manuelle (Tâche 10)

- [ ] **Step 1 : Importer et utiliser `useContours`.** Dans `DashboardInner` :

```jsx
import { useContours } from './useContours'
```

Dans le corps de `DashboardInner`, après `useDatasets` :

```jsx
  const { zoneNames, resolver } = useContours()
```

- [ ] **Step 2 : Passer le résolveur à `filterFeatures`.** Dans le `useMemo` `activeLayers`, remplacer l'appel `filterFeatures(ds.dataset.features, state.filters)` par `filterFeatures(ds.dataset.features, state.filters, resolver)`, et ajouter `resolver` aux dépendances du `useMemo`.

- [ ] **Step 3 : Alimenter le filtre géo avec les communes des contours.** Dans le `useMemo` `filterOptions`, remplacer le calcul de `zones` par `const zones = zoneNames` et ajouter `zoneNames` aux dépendances.

- [ ] **Step 4 : Ne cartographier que les jeux géométriques.** Dans `activeLayers`, ignorer les entrées `geometrie: null` pour la carte : après `if (!ds || ds.status !== 'pret') return null`, ajouter `if (entry.geometrie === null) return null` pour la couche carte — mais ces jeux doivent rester comptés dans les KPIs. Séparer en deux dérivations : `mapLayers` (géométriques) passées à `DashboardMap`, et `activeLayers` (toutes) pour les KPIs et diagrammes.

- [ ] **Step 5 : Vérifier les tests.** `npx vitest run` → seuls les 6 échecs préexistants de `api.test.js` subsistent.

- [ ] **Step 6 : Commit.**

```bash
git add src/dashboard/DashboardPage.jsx
git commit -m "feat: wire real geographic filtering into the dashboard"
```

---

## Task 10: Lint, build et vérification manuelle

**Files :** aucun (vérification).

- [ ] **Step 1 :** `npx vitest run` → seuls les 6 échecs préexistants `api.test.js`.
- [ ] **Step 2 :** `npm run lint` → pas de nouvelle erreur.
- [ ] **Step 3 :** `npm run build` → succès.
- [ ] **Step 4 : Vérification navigateur** (`npm run dev`) :
  - Domaine Mobilité : les couches points/lignes/polygones des jeux WFS et Opendatasoft s'affichent.
  - Domaine Stationnement : peuplé (parkings, PMR, 2-roues, stationnement payant) — plus d'état vide.
  - Filtre géographique : sélectionner une commune recadre carte et diagrammes ; les features hors zone disparaissent.
  - Les jeux `geometrie: null` (tarifs parkings) n'ajoutent pas de couche mais comptent dans les KPIs.
  - Vérifier les jeux en erreur (état isolé) : un échec de source n'empêche pas les autres.
- [ ] **Step 5 : Commit** d'éventuels correctifs lint/build.

---

## Self-Review (à exécuter après rédaction du code, pas maintenant)

À la fin de l'implémentation, vérifier : tout jeu de l'inventaire Tâche 1 est soit dans le registre soit explicitement exclu avec justification ; aucun `datahubId`/`datasetId` en doublon ; le filtrage géo fonctionne sur points ET lignes/polygones ; les jeux `geometrie: null` ne plantent pas `DashboardMap`.

## Suite (plan ultérieur)

Les **diagrammes analytiques spécifiques** ne sont pas dans ce plan : séries temporelles de comptage du trafic, comparaison mobilité alternative 2019, grille tarifaire des parkings. Leur conception dépend des champs réels relevés en Tâche 1 ; ils feront l'objet d'un plan dédié une fois l'inventaire disponible.
