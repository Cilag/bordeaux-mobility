# Charts Vides + Audit & Retry APIs DataHub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre les graphiques visibles sous la carte du dashboard, livrer un script d'audit des 31 endpoints DataHub, et ajouter un retry automatique avec badge "dégradé" dans la légende.

**Architecture:** Pas de refonte. Extraction d'un wrapper `fetchWithRetry` réutilisable, propagation d'un nouveau champ `degraded` dans la chaîne `loadDataset → useDatasets → LayerLegend`, fix CSS ciblé sur l'override des contraintes héritées du template Vite (`#root` à 1126px), et nouveau script Node autonome pour l'audit.

**Tech Stack:** React 19 + Vite 8 + Vitest + Leaflet + Recharts. Node natif (≥ 18) pour le script d'audit (fetch global disponible). Aucune nouvelle dépendance npm.

**Spec :** [docs/superpowers/specs/2026-05-25-charts-vides-et-audit-apis-design.md](../specs/2026-05-25-charts-vides-et-audit-apis-design.md)

---

## File Structure

**Nouveaux fichiers :**
- `src/datasets/fetchWithRetry.js` — wrapper `fetch` avec retry sur 5xx / erreur réseau.
- `src/__tests__/datasets/fetchWithRetry.test.js` — tests unitaires du wrapper.
- `src/__tests__/dashboard/LayerLegend.test.jsx` — tests du badge "dégradé".
- `scripts/audit-datahub.mjs` — smoke test des 31 endpoints DataHub.

**Fichiers modifiés :**
- `src/datasets/loadDataset.js` — utilise `fetchWithRetry`, renvoie `{ features, degraded }`.
- `src/dashboard/useDatasets.js` — propage `degraded` dans l'état par jeu.
- `src/dashboard/LayerLegend.jsx` — pastille orange si `degraded`.
- `src/index.css` — règle override `#root` quand body a la classe `fullscreen`.
- `src/dashboard/dashboard.css` — petite ombre de séparation top/bottom (cosmétique).
- `src/dashboard/DashboardPage.jsx` — `useEffect` qui toggle `body.fullscreen`.
- `src/live/LivePage.jsx` — idem pour cohérence.
- `src/__tests__/datasets/loadDataset.test.js` — vérifie `degraded`.
- `src/__tests__/dashboard/useDatasets.test.js` — vérifie propagation `degraded`.
- `package.json` — ajoute `"audit:apis": "node scripts/audit-datahub.mjs"`.

---

## Task 1 : Investigation de la cause racine (debug-first, pas de code)

**Files:** aucun (lecture/observation uniquement). Cette task produit une **conclusion** écrite dans le message de fin, qui sera référencée par Task 6.

- [ ] **Step 1 : Lancer le dev server**

Run: `npm run dev`

Expected: serveur sur `http://localhost:5173` (ou port suivant si pris).

- [ ] **Step 2 : Ouvrir `/dashboard/mobilite` dans un navigateur instrumenté**

Utilise le MCP Claude Preview (`mcp__Claude_Preview__preview_start` puis `preview_screenshot` pleine page) OU Claude in Chrome (`mcp__Claude_in_Chrome__navigate` puis `read_page`).

Capture :
- Screenshot pleine page (pour voir où s'arrête le contenu visible).
- DOM de `.dashboard-bottom` : sa position dans le viewport, sa hauteur calculée.
- Présence/absence de scroll vertical sur `<html>`, `<body>`, `#root`.
- Erreurs console.

- [ ] **Step 3 : Vérifier les 3 hypothèses du spec**

Pour chaque hypothèse, noter "confirmée" / "rejetée" / "partielle" :

- **H1** — Contrainte `#root { width: 1126px; text-align: center }` héritée du template Vite. Vérifier : `getComputedStyle(document.getElementById('root')).width` → est-ce 1126px ou la largeur de l'écran ?
- **H2** — `.dashboard-top` à `calc(100vh - 160px)` consomme tout le fold. Vérifier : `document.querySelector('.dashboard-bottom').getBoundingClientRect().top` → est-ce au-dessus ou en dessous de `window.innerHeight` ?
- **H3** — `activeLayers` vide → tous les charts en `status: 'vide'`. Vérifier : dans le DOM, `document.querySelectorAll('.chart-card').length` → est-ce 0 ou bien y a-t-il des cartes mais avec "Aucune donnée…" partout ?

- [ ] **Step 4 : Documenter la conclusion**

Écrire un message court récapitulant : quelle(s) hypothèse(s) sont confirmées, et donc quel fix sera appliqué en Task 6. Exemples :
- "H1 confirmée, H2 partielle, H3 rejetée → fix = override `#root` via body.fullscreen + petite ombre de séparation."
- "H3 confirmée (tous charts vides à cause d'un filtre par défaut trop restrictif) → fix = ajuster initialState du reducer."

**Important :** ne pas modifier de code à cette task. La sortie est purement informationnelle et pilotera Task 6.

- [ ] **Step 5 : Arrêter le dev server**

Stop le process Vite (Ctrl+C ou kill).

---

## Task 2 : Créer `fetchWithRetry` (TDD)

**Files:**
- Create: `src/datasets/fetchWithRetry.js`
- Test: `src/__tests__/datasets/fetchWithRetry.test.js`

- [ ] **Step 1 : Écrire les tests d'abord**

Create `src/__tests__/datasets/fetchWithRetry.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { fetchWithRetry } from '../../datasets/fetchWithRetry'

function okResponse(status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve({}) }
}

describe('fetchWithRetry', () => {
  it('returns the response on the first try when ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(1)
    expect(result.response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries on 503 and succeeds on the second try', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(okResponse(503))
      .mockResolvedValueOnce(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(2)
    expect(result.response.status).toBe(200)
  })

  it('does not retry on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(404))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 3, backoffMs: 0 }),
    ).rejects.toThrow('HTTP 404')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries on a fetch network exception then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(okResponse(200))
    const result = await fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 })
    expect(result.attemptsUsed).toBe(2)
  })

  it('throws after all attempts are exhausted on 5xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(503))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 2, backoffMs: 0 }),
    ).rejects.toThrow('HTTP 503')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('throws after all attempts are exhausted on network errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(
      fetchWithRetry('/x', { fetchImpl, attempts: 3, backoffMs: 0 }),
    ).rejects.toThrow('fetch failed')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 2 : Run le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/datasets/fetchWithRetry.test.js`

Expected: tous les tests échouent avec une erreur d'import (`fetchWithRetry` n'existe pas).

- [ ] **Step 3 : Implémenter le wrapper**

Create `src/datasets/fetchWithRetry.js`:

```js
// Wrapper de `fetch` avec retry sur erreur transitoire (5xx + exceptions réseau).
// Ne retry PAS sur 4xx (problème permanent : mauvais id, droits, etc.).
// Renvoie { response, attemptsUsed } pour que l'appelant sache si la retry a sauvé.
export async function fetchWithRetry(url, options = {}) {
  const {
    attempts = 2,
    backoffMs = 500,
    fetchImpl = fetch,
  } = options

  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url)
      if (response.ok) return { response, attemptsUsed: attempt }
      if (response.status >= 400 && response.status < 500) {
        // erreur permanente : pas de retry
        throw new Error(`HTTP ${response.status}`)
      }
      // 5xx : on tente une retry si possible
      lastError = new Error(`HTTP ${response.status}`)
    } catch (err) {
      if (err.message?.startsWith('HTTP 4')) throw err
      lastError = err
    }
    if (attempt < attempts) {
      await new Promise((r) => setTimeout(r, backoffMs * attempt))
    }
  }
  throw lastError
}
```

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/__tests__/datasets/fetchWithRetry.test.js`

Expected: 6 tests verts.

- [ ] **Step 5 : Commit**

```bash
git add src/datasets/fetchWithRetry.js src/__tests__/datasets/fetchWithRetry.test.js
git commit -m "feat(datasets): fetchWithRetry — retry 5xx + erreurs réseau, pas 4xx"
```

---

## Task 3 : Intégrer `fetchWithRetry` dans `loadDataset` + champ `degraded`

**Files:**
- Modify: `src/datasets/loadDataset.js`
- Modify: `src/__tests__/datasets/loadDataset.test.js`

- [ ] **Step 1 : Ajouter les tests `degraded` dans le fichier existant**

Edit `src/__tests__/datasets/loadDataset.test.js`. Remplacer le helper `fakeFetch` et ajouter 2 tests à la fin du `describe`.

Remplacer `fakeFetch` par cette version qui permet plusieurs réponses successives :

```js
function fakeFetch(body, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

function seqFetch(...responses) {
  const mock = vi.fn()
  responses.forEach((r) => {
    if (r instanceof Error) mock.mockRejectedValueOnce(r)
    else mock.mockResolvedValueOnce(r)
  })
  return mock
}
```

Ajouter ces 2 tests avant la `})` qui clôt le `describe` :

```js
  it('marks degraded:false when the first attempt succeeds', async () => {
    const result = await loadDataset(entry, { fetchImpl: fakeFetch({ features: [] }) })
    expect(result.degraded).toBe(false)
  })

  it('marks degraded:true when the retry rescues the call', async () => {
    const fetchImpl = seqFetch(
      { ok: false, status: 503, json: () => Promise.resolve(null) },
      { ok: true, status: 200, json: () => Promise.resolve({ features: [{ id: 1 }] }) },
    )
    const result = await loadDataset(entry, { fetchImpl })
    expect(result.degraded).toBe(true)
    expect(result.features).toHaveLength(1)
  })
```

- [ ] **Step 2 : Run les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/__tests__/datasets/loadDataset.test.js`

Expected: les 2 nouveaux tests échouent (`degraded` n'est pas défini sur le résultat).

- [ ] **Step 3 : Modifier `loadDataset`**

Replace the entire content of `src/datasets/loadDataset.js`:

```js
import { fetchWithRetry } from './fetchWithRetry'

const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY
const cache = new Map()

function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}?key=${DATAHUB_KEY}`
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

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/__tests__/datasets/loadDataset.test.js`

Expected: 7 tests verts (5 existants + 2 nouveaux).

- [ ] **Step 5 : Run TOUS les tests pour vérifier qu'on n'a rien cassé ailleurs**

Run: `npx vitest run`

Expected: tous les tests verts (les consommateurs de `loadDataset` continuent de marcher car ils ne lisaient que `features`).

- [ ] **Step 6 : Commit**

```bash
git add src/datasets/loadDataset.js src/__tests__/datasets/loadDataset.test.js
git commit -m "feat(loadDataset): utilise fetchWithRetry + champ degraded"
```

---

## Task 4 : Propager `degraded` dans `useDatasets`

**Files:**
- Modify: `src/dashboard/useDatasets.js`
- Modify: `src/__tests__/dashboard/useDatasets.test.js`

- [ ] **Step 1 : Ajouter un test pour la propagation de `degraded`**

Edit `src/__tests__/dashboard/useDatasets.test.js`. Ajouter ce test à la fin du `describe`, avant `})` :

```js
  it('propagates degraded:true from loadDataset to the state', async () => {
    loader.loadDataset.mockResolvedValue({ features: [], degraded: true })
    const entries = [{ id: 'a', libelle: 'A', dateField: null }]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(true)
  })

  it('defaults degraded to false when loadDataset does not set it', async () => {
    loader.loadDataset.mockResolvedValue({ features: [] })
    const entries = [{ id: 'a', libelle: 'A', dateField: null }]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(false)
  })
```

- [ ] **Step 2 : Run le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/dashboard/useDatasets.test.js`

Expected: les 2 nouveaux tests échouent (`degraded` n'existe pas sur l'état).

- [ ] **Step 3 : Modifier `useDatasets`**

Replace the entire content of `src/dashboard/useDatasets.js`:

```js
import { useState, useEffect } from 'react'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine. Renvoie un objet
//   { [id]: { status, dataset, error, degraded } }.
// status ∈ 'chargement' | 'pret' | 'erreur'.
// degraded = true si la 1re tentative a échoué mais la retry a sauvé.
export function useDatasets(entries) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null, degraded: false }])))

  useEffect(() => {
    let cancelled = false
    setStates(Object.fromEntries(
      entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null, degraded: false }])))

    async function load(entry) {
      try {
        const dataset = await loadDataset(entry)
        if (cancelled) return
        setStates((prev) => ({
          ...prev,
          [entry.id]: { status: 'pret', dataset, error: null, degraded: dataset.degraded === true },
        }))
      } catch (err) {
        if (cancelled) return
        setStates((prev) => ({
          ...prev,
          [entry.id]: { status: 'erreur', dataset: null, error: err.message, degraded: false },
        }))
      }
    }

    for (const entry of entries) {
      load(entry)
    }

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join(',')])

  return states
}
```

- [ ] **Step 4 : Run les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/__tests__/dashboard/useDatasets.test.js`

Expected: 4 tests verts (2 existants + 2 nouveaux).

- [ ] **Step 5 : Commit**

```bash
git add src/dashboard/useDatasets.js src/__tests__/dashboard/useDatasets.test.js
git commit -m "feat(useDatasets): propage degraded dans l'état par jeu"
```

---

## Task 5 : Badge "dégradé" dans `LayerLegend`

**Files:**
- Create: `src/__tests__/dashboard/LayerLegend.test.jsx`
- Modify: `src/dashboard/LayerLegend.jsx`
- Modify: `src/dashboard/dashboard.css`
- Modify: `src/dashboard/DashboardPage.jsx` (propager `degraded` dans `legendItems`)

- [ ] **Step 1 : Créer le test du badge**

Create `src/__tests__/dashboard/LayerLegend.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LayerLegend from '../../dashboard/LayerLegend'

const baseItem = {
  id: 'a',
  libelle: 'Jeu A',
  entry: { categorie: 'arrets', mode: ['bus_tram'] },
  status: 'pret',
  count: 10,
  date: null,
}

describe('LayerLegend', () => {
  it('does not render the degraded badge when not degraded', () => {
    render(<LayerLegend items={[{ ...baseItem, degraded: false }]} />)
    expect(screen.queryByTitle('Récupéré après retry')).toBeNull()
  })

  it('renders the degraded badge when degraded:true', () => {
    render(<LayerLegend items={[{ ...baseItem, degraded: true }]} />)
    expect(screen.getByTitle('Récupéré après retry')).toBeInTheDocument()
  })

  it('does not render the degraded badge for erreur status even if flag is true', () => {
    render(<LayerLegend items={[{ ...baseItem, status: 'erreur', degraded: true }]} />)
    expect(screen.queryByTitle('Récupéré après retry')).toBeNull()
  })
})
```

- [ ] **Step 2 : Run le test pour vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/dashboard/LayerLegend.test.jsx`

Expected: 2 tests échouent (le badge n'existe pas), 1 passe par chance.

- [ ] **Step 3 : Ajouter le rendu du badge dans `LayerLegend`**

Edit `src/dashboard/LayerLegend.jsx`. Remplacer la balise `<li>` actuelle (lignes 41-49) par :

```jsx
              <li key={it.id} className={`layer-legend-row layer-${it.status}`} title={it.libelle}>
                <span className="layer-dot" style={{ background: color }} />
                <div className="layer-text">
                  <span className="layer-name">{it.libelle}</span>
                  <span className="layer-date">MAJ {formatFreshness(it.date)}</span>
                </div>
                {it.status === 'pret' && it.degraded && (
                  <span className="layer-degraded" title="Récupéré après retry" aria-label="Source dégradée">⚠</span>
                )}
                <span className="layer-meta">{statusLabel(it)}</span>
              </li>
```

- [ ] **Step 4 : Ajouter le style du badge dans `dashboard.css`**

Edit `src/dashboard/dashboard.css`. Ajouter à la fin de la section `/* ----------- Layer legend ... ----------- */`, avant le `/* ----------- Filter rail ----------- */` :

```css
.layer-degraded {
  color: #E69A2B;
  font-size: 0.85rem;
  line-height: 1;
  cursor: help;
  flex-shrink: 0;
}
```

- [ ] **Step 5 : Propager `degraded` dans `legendItems` côté `DashboardPage`**

Edit `src/dashboard/DashboardPage.jsx`. Trouver le bloc `legendItems` (autour des lignes 64-71) et remplacer par :

```js
  const legendItems = useMemo(() => entries.map((entry) => {
    const ds = datasetStates[entry.id]
    const status = ds?.status ?? 'chargement'
    const layer = activeLayers.find((l) => l.id === entry.id)
    const count = layer ? layer.features.length : (ds?.dataset?.features?.length ?? 0)
    const date = ds?.dataset ? datasetDate(entry, ds.dataset) : null
    const degraded = ds?.degraded === true
    return { id: entry.id, libelle: entry.libelle, entry, status, count, date, degraded }
  }), [entries, datasetStates, activeLayers])
```

- [ ] **Step 6 : Run les tests LayerLegend + tests existants**

Run: `npx vitest run src/__tests__/dashboard/LayerLegend.test.jsx src/__tests__/dashboard/`

Expected: tous les tests verts.

- [ ] **Step 7 : Run TOUS les tests pour vérifier qu'on n'a rien cassé**

Run: `npx vitest run`

Expected: tous verts.

- [ ] **Step 8 : Commit**

```bash
git add src/dashboard/LayerLegend.jsx src/dashboard/dashboard.css src/dashboard/DashboardPage.jsx src/__tests__/dashboard/LayerLegend.test.jsx
git commit -m "feat(legend): badge ⚠ orange quand un jeu est dégradé (retry sauve)"
```

---

## Task 6 : Fix CSS layout charts vides

**Files (selon conclusion de Task 1) :**
- Modify: `src/index.css`
- Modify: `src/dashboard/DashboardPage.jsx`
- Modify: `src/live/LivePage.jsx`
- Modify: `src/dashboard/dashboard.css`

> **Adapter cette task aux conclusions de Task 1.** Le code ci-dessous suit l'hypothèse la plus probable (H1 confirmée : contrainte `#root` héritée). Si Task 1 a conclu autre chose, ajuster les Steps 2-4 en conséquence et garder le reste de la structure.

- [ ] **Step 1 : Confirmer l'hypothèse retenue**

Relire la conclusion écrite en Task 1 Step 4. Si H1 confirmée → poursuivre. Sinon → adapter les fichiers et le code des étapes suivantes au fix réel (par ex. si H3, modifier `dashboardReducer.initialState` au lieu de l'override CSS).

- [ ] **Step 2 : Ajouter l'override `body.fullscreen #root` dans `src/index.css`**

Edit `src/index.css`. Après le bloc `#root { ... }` (qui se termine ligne 67), ajouter :

```css
/* Override des contraintes héritées du template Vite pour les routes
   conçues en pleine largeur (dashboard, live). Activé par
   `document.body.classList.add('fullscreen')` dans le composant racine. */
body.fullscreen #root {
  width: 100%;
  max-width: 100%;
  margin: 0;
  text-align: left;
  border-inline: none;
}
```

- [ ] **Step 3 : Toggle `body.fullscreen` au montage du `DashboardPage`**

Edit `src/dashboard/DashboardPage.jsx`. Dans le composant `DashboardInner`, ajouter ce `useEffect` juste **après** le `useEffect` `loadDataset({ id: 'carrefours-feux', ... })` (autour ligne 39) :

```jsx
  useEffect(() => {
    document.body.classList.add('fullscreen')
    return () => document.body.classList.remove('fullscreen')
  }, [])
```

`useEffect` est déjà importé en ligne 1.

- [ ] **Step 4 : Idem pour `LivePage`**

Read `src/live/LivePage.jsx`. Ajouter l'import `useEffect` depuis `react` s'il n'est pas déjà importé, et ajouter le même `useEffect` dans le composant racine :

```jsx
  useEffect(() => {
    document.body.classList.add('fullscreen')
    return () => document.body.classList.remove('fullscreen')
  }, [])
```

- [ ] **Step 5 : Ajouter une ombre de séparation entre top et bottom (signal visuel)**

Edit `src/dashboard/dashboard.css`. Modifier la règle `.dashboard-bottom` (autour ligne 118) :

```css
.dashboard-bottom {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 -8px 12px -8px rgba(15, 23, 42, 0.15);
}
```

L'ombre douce indique qu'il y a du contenu en haut, et invite à scroller.

- [ ] **Step 6 : Vérification visuelle manuelle**

Run: `npm run dev`

Ouvrir `http://localhost:5173/dashboard/mobilite` via le MCP Claude Preview ou Chrome :
- Screenshot pleine page.
- Vérifier que `#root` prend toute la largeur (pas centré dans 1126px).
- Vérifier que le scroll fait apparaître `.dashboard-bottom` avec ses KPIs et charts.
- Naviguer aussi vers `/dashboard/stationnement` et `/live` — même check.

Si une régression apparaît sur les pages template (route racine `/`), corriger en ne mettant l'override que sur les routes ciblées (vérifier que `body.fullscreen` n'est pas resté actif).

Stop le dev server à la fin.

- [ ] **Step 7 : Run les tests pour vérifier qu'on n'a rien cassé**

Run: `npx vitest run`

Expected: tous les tests verts.

- [ ] **Step 8 : Commit**

```bash
git add src/index.css src/dashboard/DashboardPage.jsx src/live/LivePage.jsx src/dashboard/dashboard.css
git commit -m "fix(layout): override #root template pour pages pleine largeur + ombre top/bottom"
```

---

## Task 7 : Script `npm run audit:apis`

**Files:**
- Create: `scripts/audit-datahub.mjs`
- Modify: `package.json`

- [ ] **Step 1 : Créer le dossier scripts**

Run: `mkdir scripts`

(Sur Windows PowerShell : `New-Item -ItemType Directory -Force scripts`.)

- [ ] **Step 2 : Créer le script d'audit**

Create `scripts/audit-datahub.mjs`:

```js
#!/usr/bin/env node
// Smoke test des 31 endpoints DataHub.
// Lit la clé depuis .env (VITE_DATAHUB_API_KEY).
// Usage: node scripts/audit-datahub.mjs
//
// Exit 0 si tout OK, 1 si au moins un FAIL.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REGISTRY } from '../src/datasets/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Codes ANSI bruts (pas de chalk).
const C = { dim: '\x1b[2m', reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m' }

function readEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return {}
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const eq = trimmed.indexOf('=')
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

function buildUrl(source, key) {
  if (source.type === 'datahub-geojson') {
    return `https://data.bordeaux-metropole.fr/geojson/features/${source.datahubId}?key=${key}`
  }
  if (source.type === 'opendatasoft') {
    return `https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

function pad(s, n) { return String(s).padEnd(n) }

async function auditOne(entry, key, index, total) {
  const url = buildUrl(entry.source, key)
  const t0 = Date.now()
  const prefix = `[${String(index).padStart(2)}/${total}] ${pad(entry.id, 28)}`
  try {
    const res = await fetch(url)
    const ms = Date.now() - t0
    if (!res.ok) {
      console.log(`${prefix} ${C.red}FAIL${C.reset}  HTTP ${res.status}  ${C.dim}${ms} ms${C.reset}`)
      return { id: entry.id, ok: false, empty: false }
    }
    const json = await res.json()
    const features = json?.features?.length ?? 0
    const sizeKB = (JSON.stringify(json).length / 1024).toFixed(1)
    if (features === 0) {
      console.log(`${prefix} ${C.yellow}OK  ${C.reset}  ${pad(`${ms} ms`, 7)}  ${pad(features, 5)} features  ${pad(`${sizeKB} KB`, 8)}  ${C.yellow}⚠ empty${C.reset}`)
      return { id: entry.id, ok: true, empty: true }
    }
    console.log(`${prefix} ${C.green}OK  ${C.reset}  ${pad(`${ms} ms`, 7)}  ${pad(features, 5)} features  ${pad(`${sizeKB} KB`, 8)}`)
    return { id: entry.id, ok: true, empty: false }
  } catch (err) {
    const ms = Date.now() - t0
    console.log(`${prefix} ${C.red}FAIL${C.reset}  ${err.message}  ${C.dim}${ms} ms${C.reset}`)
    return { id: entry.id, ok: false, empty: false }
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  const env = readEnv()
  const key = process.env.VITE_DATAHUB_API_KEY || env.VITE_DATAHUB_API_KEY
  if (!key) {
    console.error(`${C.red}Erreur : VITE_DATAHUB_API_KEY introuvable (cherchée dans process.env et .env)${C.reset}`)
    process.exit(2)
  }

  const datahubEntries = REGISTRY.filter((e) => e.source.type === 'datahub-geojson')
  console.log(`${C.cyan}DataHub audit · ${new Date().toISOString()}${C.reset}\n`)

  const t0 = Date.now()
  const results = []
  for (let i = 0; i < datahubEntries.length; i++) {
    results.push(await auditOne(datahubEntries[i], key, i + 1, datahubEntries.length))
    await sleep(200) // rate-limit poli
  }

  const okCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length
  const emptyCount = results.filter((r) => r.empty).length
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1)

  console.log(`\n${C.dim}─────────────────────────────────────${C.reset}`)
  console.log(`${okCount}/${results.length} OK · ${failCount > 0 ? C.red : ''}${failCount} FAIL${C.reset} · ${emptyCount} EMPTY · ${totalSec} s total`)
  process.exit(failCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`${C.red}Erreur fatale : ${err.message}${C.reset}`)
  process.exit(2)
})
```

- [ ] **Step 3 : Ajouter le script npm**

Edit `package.json`. Dans la section `"scripts"`, ajouter une ligne après `"test"` :

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest",
    "audit:apis": "node scripts/audit-datahub.mjs"
  },
```

- [ ] **Step 4 : Lancer l'audit et vérifier la sortie**

Run: `npm run audit:apis`

Expected:
- Sortie tableau avec 31 lignes (ou 30 si une couche est temporairement down).
- Chaque ligne montre id, statut (OK/FAIL coloré), latence, nb features, taille.
- Ligne de récap en bas du type `30/31 OK · 1 FAIL · 0 EMPTY · X.X s total`.
- Exit code `0` si tout OK, `1` si au moins un FAIL.

Si la clé n'est pas dans `.env`, le script doit afficher l'erreur et exit `2`.

- [ ] **Step 5 : Commit**

```bash
git add scripts/audit-datahub.mjs package.json
git commit -m "feat(audit): npm run audit:apis — smoke test des 31 endpoints DataHub"
```

---

## Task 8 : Vérification finale et résumé

**Files:** aucun (vérification uniquement).

- [ ] **Step 1 : Tous les tests verts**

Run: `npx vitest run`

Expected: 100 % verts, pas de skip non documenté.

- [ ] **Step 2 : Lint clean**

Run: `npm run lint`

Expected: 0 erreur (warnings tolérés s'ils existaient déjà).

- [ ] **Step 3 : Build production OK**

Run: `npm run build`

Expected: build réussit sans warning bloquant.

- [ ] **Step 4 : Audit APIs réussit**

Run: `npm run audit:apis`

Expected: exit `0` (ou exit `1` si DataHub a un jeu réellement down — dans ce cas, noter le jeu dans le message final).

- [ ] **Step 5 : Vérification visuelle**

Run: `npm run dev`, puis ouvrir `http://localhost:5173/dashboard/mobilite` via Chrome MCP ou navigateur :
- Charts visibles sous la carte sans manipulation (scroll naturel OK).
- KPIs affichés.
- Légende des jeux fonctionnelle.
- Bascule vers `/dashboard/stationnement` : idem.

Stop le dev server.

- [ ] **Step 6 : Message de complétion**

Écrire un court récap avec :
- Confirmation que les 3 objectifs du spec sont atteints (charts visibles / audit fonctionnel / retry+badge actifs).
- Conclusion finale de l'audit (combien de jeux DataHub OK / FAIL / EMPTY).
- Pointer la prochaine étape : déploiement Vercel (étape 2/3).

---

## Self-review du plan

**Couverture du spec :**
- Objectif 1 (charts visibles) → Tasks 1 (investigation) + 6 (fix) + 8 (vérif).
- Objectif 2 (`npm run audit:apis`) → Task 7.
- Objectif 3 (retry + badge dégradé) → Tasks 2 + 3 + 4 + 5.
- Investigation préalable (§ Investigation) → Task 1.
- Architecture (composants) → Tasks 2-5.
- Stratégie CSS → Task 6.
- Comportement smoke test (exemple de sortie) → Task 7.
- Comportement retry (5xx/réseau, pas 4xx, backoff) → Tasks 2 + 3.
- Tests TDD listés dans le spec → tous présents dans Tasks 2-5.
- Critères d'acceptation → Task 8.

Aucun gap identifié.

**Placeholders :** aucun "TBD" / "implémenter plus tard" / "etc." dans les steps.

**Cohérence des types :** la signature `{ features, degraded }` est introduite en Task 3, propagée comme `degraded` à plat dans l'état `useDatasets` en Task 4, lue comme `it.degraded` dans `LayerLegend` (Task 5) avec propagation explicite via `legendItems` (Task 5 Step 5). Cohérent.
