# Filtres DataHub-only + refonte layout dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recentrer le dashboard sur les seules APIs DataHub Bordeaux Métropole, refondre le layout en `[Filtres | Carte]` + `[Graphiques]`, et améliorer le rail de filtres (groupes pliables, boutons lisibles, statut global).

**Architecture:** Suppression de 16 entrées Opendatasoft du registry, suppression du hook `useBikeUsage` et des 4-5 graphiques qui en dépendaient. Refactor CSS+JSX du `DashboardPage` pour passer d'un layout 3 colonnes à un layout 2 lignes. Ajout d'un état local `collapsedGroups` dans `FilterRail` et refonte du JSX/CSS de l'en-tête.

**Tech Stack:** React 19, Vite, Vitest, Testing Library, Leaflet, CSS pur.

---

## File Structure

| Fichier | Action | Rôle après changement |
|---|---|---|
| `src/datasets/registry.js` | modifier | Catalogue des 31 jeux DataHub (suppression des entrées Opendatasoft) |
| `src/dashboard/useBikeUsage.js` | **supprimer** | (n'existe plus) |
| `src/dashboard/DashboardPage.jsx` | modifier | Plus de useBikeUsage, plus de calculs accidents/trafic, nouveau layout 2 lignes |
| `src/dashboard/FilterRail.jsx` | modifier | Groupes pliables + boutons `Tout`/`Aucun` + en-tête statut global |
| `src/dashboard/dashboard.css` | modifier | Layout `.dashboard-top` (grid 320px+1fr), `.dashboard-bottom` pleine largeur, refonte `.filter-*` |
| `src/__tests__/dashboard/FilterRail.test.jsx` | modifier | Ajout test « cliquer en-tête plie/déplie » |

---

## Task 1: Purger le registry des sources non-DataHub

**Files:**
- Modify: `src/datasets/registry.js`

**Goal:** Ne garder que les entrées avec `source.type === 'datahub-geojson'`. Le registry passe de 47 à 31 entrées.

- [ ] **Step 1: Lister les entrées à supprimer (vérification)**

Identifiants à retirer (16) :
- Mobilité Opendatasoft : `chantiers-actifs`, `comptage-trafic`, `mobilite-alternative-2019`, `irve-schema-directeur`, `vehicules-autopartage`, `voies-noms`, `reve-itineraires`, `lieux-desservis`, `arret-lieu-relations`, `lignes-commerciales`, `vitesses-radars`, `zones-reglementaires`, `accidents-corporels`
- Stationnement Opendatasoft : `stationnement-payant`, `parkings-techniques`, `parkings-tarifs`

- [ ] **Step 2: Supprimer ces blocs dans `src/datasets/registry.js`**

Ouvrir `src/datasets/registry.js`. Supprimer les objets `{ id: '<id>', ... }` correspondants. Supprimer aussi les en-têtes de section qui deviennent vides :
- `// ---------- Mobilité (datasets Opendatasoft) ----------` (toute la section disparaît)
- `// ---------- Stationnement (datasets Opendatasoft) ----------` (toute la section disparaît)

Garder les en-têtes `// ---------- Mobilité (couches WFS — datahub-geojson) ----------` et `// ---------- Stationnement (couches WFS) ----------`.

- [ ] **Step 3: Vérifier le compte**

Run: `node -e "const r = require('./src/datasets/registry.js'); console.log('mob:', r.REGISTRY.filter(e=>e.domaine==='mobilite').length, 'sta:', r.REGISTRY.filter(e=>e.domaine==='stationnement').length)"`

Si Node rejette l'ESM, utiliser à la place :
Run: `npx vitest run --reporter=basic 2>&1 | head -30`

Expected: `mob: 26 sta: 5` (ou tests qui passent).

- [ ] **Step 4: Lancer toute la suite de tests**

Run: `npx vitest run`

Expected: certains tests peuvent encore passer ; si un test référence un id supprimé (ex. `accidents-corporels`), il échouera — passer à la Task 2 qui retire le code dépendant. Noter les échecs mais ne pas commit.

- [ ] **Step 5: Commit**

```bash
git add src/datasets/registry.js
git commit -m "feat: registry réduit aux 31 APIs DataHub Bordeaux Métropole

Suppression des 16 jeux Opendatasoft (accidents, comptage trafic,
chantiers, parkings techniques, etc.) pour recentrer le dashboard
sur les couches WFS data.bordeaux-metropole.fr."
```

---

## Task 2: Supprimer le hook `useBikeUsage` et son utilisation

**Files:**
- Delete: `src/dashboard/useBikeUsage.js`
- Modify: `src/dashboard/DashboardPage.jsx`

**Goal:** Le hook utilise l'API Opendatasoft `pc_velo_p`. Le chart `velo-top-capteurs` qui en dépend est supprimé.

- [ ] **Step 1: Supprimer le fichier hook**

Run: `rm src/dashboard/useBikeUsage.js`

- [ ] **Step 2: Retirer l'import et l'usage dans `DashboardPage.jsx`**

Dans `src/dashboard/DashboardPage.jsx` :

Supprimer la ligne :
```jsx
import { useBikeUsage } from './useBikeUsage'
```

Supprimer la ligne :
```jsx
const bikeUsage = useBikeUsage({ from: state.filters.from, to: state.filters.to })
```

- [ ] **Step 3: Retirer le chart `velo-top-capteurs`**

Toujours dans `DashboardPage.jsx`, dans le `useMemo` qui construit `charts`, supprimer le bloc :
```jsx
out.push({
  key: 'velo-top-capteurs',
  title: state.filters.from != null && state.filters.to != null
    ? `🚲 Lieux les plus fréquentés en vélo — passages ${state.filters.from}-${state.filters.to}`
    : '🚲 Lieux les plus fréquentés en vélo — passages cumulés (fenêtre 2 ans)',
  status: bikeUsage.status,
  date: oldest,
  type: 'velo-top-capteurs',
  data: bikeUsage.items,
})
```

Dans les `deps` du `useMemo`, retirer `bikeUsage` et `state.filters.from`, `state.filters.to` (s'ils ne sont plus utilisés ailleurs dans ce useMemo — vérifier).

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run`

Expected: si un composant `ChartGrid` rend encore `type: 'velo-top-capteurs'`, vérifier qu'aucun test ne casse. Le type peut rester défini côté `ChartGrid` (mort mais inoffensif) ou être nettoyé en Task 4.

- [ ] **Step 5: Commit**

```bash
git add -u src/dashboard/useBikeUsage.js src/dashboard/DashboardPage.jsx
git commit -m "refactor: retire useBikeUsage et le graphe top capteurs vélo

Le hook dépendait de l'API Opendatasoft pc_velo_p, hors périmètre
DataHub. Le graphique correspondant est supprimé."
```

---

## Task 3: Supprimer les graphiques accidents et trafic Opendatasoft

**Files:**
- Modify: `src/dashboard/DashboardPage.jsx`

**Goal:** Retirer les useMemo et chart entries qui dépendent de `comptage-trafic` (Opendatasoft) et `accidents-corporels` (Opendatasoft), tous deux désormais absents du registry.

- [ ] **Step 1: Retirer les `useMemo` morts**

Dans `src/dashboard/DashboardPage.jsx`, supprimer les blocs entiers :

1. `const trafficTopRoads = useMemo(() => { ... }, [activeLayers])`
2. `const peakHoursByRoad = useMemo(() => { ... }, [activeLayers])`
3. `const accidentsByVehicle = useMemo(() => { ... }, [activeLayers])`
4. `const accidentsByYear = useMemo(() => { ... }, [activeLayers])`

- [ ] **Step 2: Retirer les chart entries correspondants**

Dans le `useMemo` `charts`, supprimer les blocs :
- `key: 'trafic-top-voies'`
- `key: 'peak-hours'`
- `key: 'accidents-par-annee'`
- `key: 'accidents-par-vehicule'`

Mettre à jour la dependency list du `useMemo` charts : retirer `trafficTopRoads, accidentsByYear, accidentsByVehicle, peakHoursByRoad`.

- [ ] **Step 3: Vérifier la propreté**

Run: `npx grep -n "trafficTopRoads\|peakHoursByRoad\|accidentsByVehicle\|accidentsByYear\|accidents-corporels\|comptage-trafic" src/dashboard/DashboardPage.jsx`

(ou avec l'outil Grep si dans Claude Code)

Expected: aucune ligne.

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run`

Expected: tous les tests passent.

- [ ] **Step 5: Vérifier visuellement (optionnel mais recommandé)**

Run: `npm run dev`

Ouvrir `http://localhost:5173/dashboard/mobilite`. Vérifier qu'aucune erreur console n'apparaît et que le dashboard se charge. Tuer le serveur (`Ctrl+C`).

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/DashboardPage.jsx
git commit -m "refactor: retire les graphes Opendatasoft (accidents, trafic)

trafficTopRoads, peakHoursByRoad, accidentsByYear, accidentsByVehicle
dépendaient de comptage-trafic et accidents-corporels (Opendatasoft).
Les charts associés sont supprimés."
```

---

## Task 4: Nouveau layout — `[Filtres | Carte]` haut, `[Graphiques]` bas

**Files:**
- Modify: `src/dashboard/DashboardPage.jsx`
- Modify: `src/dashboard/dashboard.css`

**Goal:** Passer du layout actuel (3 colonnes flex `Map | Analytics | FilterRail`) au layout 2 lignes : rangée haute `[FilterRail 320px | DashboardMap flex:1]`, rangée basse `KpiRow + ChartGrid` pleine largeur.

- [ ] **Step 1: Modifier le JSX dans `DashboardPage.jsx`**

Repérer le `return (...)` de `DashboardInner`. Remplacer le bloc :
```jsx
<div className="dashboard-body">
  <div className="dashboard-map">
    {empty
      ? <p className="state-msg">Aucune source configurée pour ce domaine.</p>
      : (
        <>
          <DashboardMap layers={activeLayers} />
          <LayerLegend items={legendItems} />
        </>
      )}
  </div>
  <div className="dashboard-analytics">
    {empty
      ? <p className="state-msg">Aucun indicateur disponible.</p>
      : (
        <>
          <KpiRow kpis={kpis} />
          <ChartGrid charts={charts} />
        </>
      )}
  </div>
  <FilterRail options={filterOptions} />
</div>
```

par :
```jsx
<div className="dashboard-top">
  <FilterRail options={filterOptions} />
  <div className="dashboard-map">
    {empty
      ? <p className="state-msg">Aucune source configurée pour ce domaine.</p>
      : (
        <>
          <DashboardMap layers={activeLayers} />
          <LayerLegend items={legendItems} />
        </>
      )}
  </div>
</div>
<div className="dashboard-bottom">
  {empty
    ? <p className="state-msg">Aucun indicateur disponible.</p>
    : (
      <>
        <KpiRow kpis={kpis} />
        <ChartGrid charts={charts} />
      </>
    )}
</div>
```

- [ ] **Step 2: Mettre à jour le CSS dans `dashboard.css`**

Dans `src/dashboard/dashboard.css`, remplacer la section `/* ----------- Layout ----------- */` :

```css
.dashboard-body { display: flex; flex: 1; min-height: 0; }
.dashboard-map { flex: 1; min-width: 0; position: relative; }
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
```

par :

```css
.dashboard-top {
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: 60vh;
  flex-shrink: 0;
}
.dashboard-map { position: relative; min-width: 0; }
.dashboard-bottom {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
  background: #f4f6f8;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

- [ ] **Step 3: Adapter `.filter-rail` (bordure côté droit au lieu de gauche)**

Toujours dans `dashboard.css`, dans le bloc `.filter-rail` :
- Remplacer `border-left: 1px solid #d4d4d8;` par `border-right: 1px solid #d4d4d8;`
- Retirer `width: 280px;` et `flex-shrink: 0;` (la grille s'en occupe). Garder `overflow-y: auto;` et `padding: 1rem;`.

- [ ] **Step 4: Mettre `.chart-grid` en grille auto-fit**

Dans `dashboard.css`, remplacer :
```css
.chart-grid { display: flex; flex-direction: column; gap: 1rem; }
```
par :
```css
.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 1rem;
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run`

Expected: tous passent (les tests ne dépendent pas du layout CSS).

- [ ] **Step 6: Vérification visuelle**

Run: `npm run dev`

Ouvrir `http://localhost:5173/dashboard/mobilite`. Vérifier :
1. Rail de filtres à gauche, carte à droite (rangée haute).
2. KPIs + graphiques en bas, pleine largeur, en grille 2 colonnes.
3. Pas de scroll horizontal sur la page.

Tuer le serveur.

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/DashboardPage.jsx src/dashboard/dashboard.css
git commit -m "feat: layout dashboard en 2 lignes — [Filtres|Carte] puis [Graphes]

Le rail de filtres passe à gauche, la carte à droite (grille 320px+1fr),
les KPIs et graphiques en dessous en pleine largeur (grille auto-fit
minmax(380px, 1fr))."
```

---

## Task 5: Ajouter les groupes pliables dans `FilterRail` (TDD)

**Files:**
- Modify: `src/__tests__/dashboard/FilterRail.test.jsx`
- Modify: `src/dashboard/FilterRail.jsx`
- Modify: `src/dashboard/dashboard.css`

**Goal:** Chaque groupe thème (capteurs, réseau, etc.) peut être plié/déplié au clic sur son en-tête. État local, pas dans le reducer (UI-only).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/__tests__/dashboard/FilterRail.test.jsx`, dans le `describe('FilterRail', ...)` :

```jsx
  it('plie et déplie un groupe au clic sur son en-tête', async () => {
    renderRail()
    // Au départ, les checkbox sont visibles.
    expect(screen.getByLabelText('Arrêts TBM')).toBeInTheDocument()
    // Cliquer sur l'en-tête du groupe "Réseau de transport".
    await userEvent.click(screen.getByRole('button', { name: /Réseau de transport/ }))
    // La checkbox doit avoir disparu du DOM.
    expect(screen.queryByLabelText('Arrêts TBM')).not.toBeInTheDocument()
    // Recliquer la fait réapparaître.
    await userEvent.click(screen.getByRole('button', { name: /Réseau de transport/ }))
    expect(screen.getByLabelText('Arrêts TBM')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/__tests__/dashboard/FilterRail.test.jsx -t "plie"`

Expected: FAIL — il n'existe pas encore de `button` avec le nom du groupe.

- [ ] **Step 3: Implémenter le toggle pliable dans `FilterRail.jsx`**

Dans `src/dashboard/FilterRail.jsx`, en tête du composant, ajouter l'import :
```jsx
import { useMemo, useState } from 'react'
```

Ajouter l'état local sous `const { filters } = state` :
```jsx
const [collapsed, setCollapsed] = useState(() => new Set())
function toggleCollapse(themeId) {
  setCollapsed((prev) => {
    const next = new Set(prev)
    if (next.has(themeId)) next.delete(themeId)
    else next.add(themeId)
    return next
  })
}
```

Modifier le rendu d'un groupe. Remplacer le bloc :
```jsx
<div className="filter-group-head">
  <span className="filter-group-dot" style={{ background: g.color }} />
  <span className="filter-group-label">{g.label}</span>
  <span className="filter-group-count">{g.entries.length}</span>
  <button
    type="button"
    className="filter-group-toggle"
    onClick={() => toggleTheme(g.entries)}
    title={allEnabled ? `Tout désactiver — ${g.label}` : `Tout activer — ${g.label}`}
  >
    {allEnabled ? 'Aucun' : 'Tout'}
  </button>
</div>
{g.entries.map((entry) => (
  ...
))}
```

par :
```jsx
<button
  type="button"
  className="filter-group-head"
  onClick={() => toggleCollapse(g.id)}
  aria-expanded={!collapsed.has(g.id)}
>
  <span className="filter-group-chevron">{collapsed.has(g.id) ? '›' : '⌄'}</span>
  <span className="filter-group-dot" style={{ background: g.color }} />
  <span className="filter-group-label">{g.label}</span>
  <span className="filter-group-count">{g.entries.length}</span>
</button>
{!collapsed.has(g.id) && (
  <>
    <div className="filter-group-actions">
      <button
        type="button"
        className="filter-group-action"
        onClick={() => toggleTheme(g.entries)}
      >
        {allEnabled ? 'Aucun' : 'Tout'}
      </button>
    </div>
    {g.entries.map((entry) => (
      <label key={entry.id} className="filter-cat" title={entry.libelle}>
        <input
          type="checkbox"
          checked={isOn(entry.id)}
          onChange={() => dispatch({ type: 'TOGGLE_DATASET', value: entry.id })}
        />
        <span className="filter-cat-name">{entry.libelle}</span>
        {entryCounts[entry.id] != null && entryCounts[entry.id] > 0 && (
          <span className="filter-cat-count">{entryCounts[entry.id].toLocaleString('fr-FR')}</span>
        )}
      </label>
    ))}
  </>
)}
```

Note : en Task 6 on remplacera ce bouton unique par 2 boutons explicites `Tout` et `Aucun`.

- [ ] **Step 4: Ajouter le CSS minimum**

Dans `src/dashboard/dashboard.css`, ajouter après `.filter-group-head` :

```css
.filter-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: none;
  border: none;
  padding: 4px 2px;
  cursor: pointer;
  text-align: left;
  color: inherit;
}
.filter-group-chevron {
  font-size: 0.8rem;
  color: #5a6b7d;
  width: 12px;
  display: inline-block;
}
.filter-group-actions {
  display: flex;
  gap: 4px;
  padding: 2px 0 4px 18px;
}
.filter-group-action {
  font-size: 0.7rem;
  background: #f1f4f7;
  border: 1px solid #d4d4d8;
  border-radius: 6px;
  padding: 2px 8px;
  cursor: pointer;
  color: #1e3a5f;
}
.filter-group-action:hover { background: #e0e8f0; }
```

Supprimer l'ancienne règle `.filter-group-head { display: flex; align-items: center; ... }` qui existait avant — la nouvelle version la remplace.

Supprimer aussi l'ancienne règle `.filter-group-toggle` (devenue inutile).

- [ ] **Step 5: Lancer le test ciblé**

Run: `npx vitest run src/__tests__/dashboard/FilterRail.test.jsx`

Expected: les 5 tests passent (les 4 existants + le nouveau).

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run`

Expected: tous les tests passent.

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/FilterRail.jsx src/dashboard/dashboard.css src/__tests__/dashboard/FilterRail.test.jsx
git commit -m "feat(filters): groupes thèmes pliables au clic sur l'en-tête

État local collapsedGroups, chevron + aria-expanded. Test ajouté."
```

---

## Task 6: Polish UX — boutons `Tout`/`Aucun` + en-tête statut global

**Files:**
- Modify: `src/dashboard/FilterRail.jsx`
- Modify: `src/dashboard/dashboard.css`

**Goal:**
- Remplacer le bouton unique `Tout/Aucun` par 2 boutons explicites côte à côte.
- Compteur de groupe `actifs/total` (ex. `3 / 7`).
- Sous le titre, ligne de statut global `X jeux affichés sur 31` + bouton `Réinitialiser` plus visible.

- [ ] **Step 1: Remplacer la zone d'actions du groupe**

Dans `src/dashboard/FilterRail.jsx`, remplacer le `<div className="filter-group-actions">` ajouté en Task 5 par :

```jsx
<div className="filter-group-actions">
  <button
    type="button"
    className="filter-group-action"
    onClick={() => dispatch({ type: 'SET_DISABLED_DATASETS', value: disabled.filter((id) => !g.entries.map((e) => e.id).includes(id)) })}
  >
    Tout
  </button>
  <button
    type="button"
    className="filter-group-action"
    onClick={() => dispatch({ type: 'SET_DISABLED_DATASETS', value: [...new Set([...disabled, ...g.entries.map((e) => e.id)])] })}
  >
    Aucun
  </button>
</div>
```

(On simplifie : le bouton `toggleTheme` unique disparaît, plus besoin de la fonction `toggleTheme`. La supprimer du composant.)

- [ ] **Step 2: Compteur de groupe `actifs/total`**

Toujours dans `FilterRail.jsx`, calculer le nombre actif et remplacer le span de compteur. Avant le `return` du `.map((g) => ...)`, ajouter :

```jsx
const activeCount = g.entries.filter((e) => !disabled.includes(e.id)).length
```

Et remplacer :
```jsx
<span className="filter-group-count">{g.entries.length}</span>
```
par :
```jsx
<span className="filter-group-count">{activeCount} / {g.entries.length}</span>
```

- [ ] **Step 3: En-tête statut global**

Dans le `return` de `FilterRail`, juste après `<div className="filter-rail-head">...</div>`, ajouter :

```jsx
<div className="filter-rail-status">
  {entries.length - disabled.length} jeux affichés sur {entries.length}
</div>
```

Et restyler le bouton `Réinitialiser` (modifier l'élément existant) — ajouter la classe `filter-rail-reset` :
```jsx
<button type="button" className="filter-rail-reset" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
  Réinitialiser
</button>
```

- [ ] **Step 4: CSS pour le statut + boutons réinit**

Dans `src/dashboard/dashboard.css`, ajouter :

```css
.filter-rail-status {
  font-size: 0.72rem;
  color: #5a6b7d;
  margin: 4px 0 8px;
  padding: 4px 6px;
  background: #f1f4f7;
  border-radius: 6px;
}
.filter-rail-reset {
  font-size: 0.72rem;
  background: #e8eef5;
  border: 1px solid #1e3a5f;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: #1e3a5f;
  font-weight: 600;
}
.filter-rail-reset:hover { background: #1e3a5f; color: #fff; }
```

Et retirer / remplacer l'ancienne règle `.filter-rail-head button { ... }` (qui stylait le bouton de reset). Garder le `.filter-rail-head { display: flex; ... }`.

Ajuster le compteur :
```css
.filter-group-count {
  margin-left: auto;
  font-size: 0.65rem;
  color: #5a6b7d;
  background: #e8eef5;
  border-radius: 8px;
  padding: 1px 8px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
```

(Si déjà présent, juste ajouter `font-weight: 600;`.)

Atténuer le compteur de features par jeu :
```css
.filter-cat-count {
  font-size: 0.68rem;
  color: #9aa5b1;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run`

Expected: tous les tests passent. Le test « décocher une case » continue d'utiliser `getByLabelText('Arrêts TBM')`, donc le groupe doit être déplié par défaut (c'est le cas — `collapsed` démarre vide).

- [ ] **Step 6: Vérification visuelle**

Run: `npm run dev`

Ouvrir `http://localhost:5173/dashboard/mobilite`. Vérifier :
1. En haut du rail : titre `Filtres` + bouton `Réinitialiser` bleu/visible, puis ligne `X jeux affichés sur 26`.
2. Chaque groupe affiche `actifs/total` à droite (ex. `7 / 7`).
3. Cliquer un en-tête le plie ; les boutons `Tout`/`Aucun` apparaissent à l'ouverture.
4. Cliquer `Aucun` décoche toutes les cases du groupe, le compteur passe à `0 / 7`.
5. Cliquer `Tout` les recoche.

Tuer le serveur.

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/FilterRail.jsx src/dashboard/dashboard.css
git commit -m "feat(filters): UX polish — boutons Tout/Aucun + statut global

- 2 boutons explicites par groupe au lieu du toggle pill
- Compteur 'actifs/total' par groupe
- Ligne 'X jeux affichés sur N' sous le titre du rail
- Bouton Réinitialiser remis en évidence (bordure bleue)"
```

---

## Task 7: Passage final — tests + vérification visuelle de bout en bout

**Files:** (lecture seule)

**Goal:** Vérifier que rien n'a été cassé et qu'il ne reste pas de référence morte à du code Opendatasoft.

- [ ] **Step 1: Lancer la suite complète**

Run: `npx vitest run`

Expected: 100% PASS, nombre de tests inchangé sauf +1 (le nouveau test pliable).

- [ ] **Step 2: Chasse au code mort**

Run (Grep tool) : chercher `pc_velo_p|useBikeUsage|accidents-corporels|comptage-trafic|trafficTopRoads|peakHoursByRoad|accidentsByVehicle|accidentsByYear|filter-group-toggle` dans `src/`.

Expected: 0 résultat (sauf éventuellement dans les types `ChartGrid` — si une `case 'velo-top-capteurs'` traîne, l'enlever).

- [ ] **Step 3: Vérification visuelle dashboard mobilité**

Run: `npm run dev`

Ouvrir `http://localhost:5173/dashboard/mobilite`. Vérifier :
- Carte affichée à droite des filtres.
- Le rail liste bien tous les groupes thèmes avec leurs jeux DataHub uniquement.
- KPIs + graphiques en bas en grille.
- Aucune erreur dans la console.

- [ ] **Step 4: Vérification dashboard stationnement**

Naviguer sur `http://localhost:5173/dashboard/stationnement`. Vérifier :
- 5 jeux dans le rail (parkings-hors-voirie, emplacements-2roues, arceaux-velo, parcs-velo, places-pmr).
- Graphiques `capacite-par-commune`, `top-parkings`, `offre-demande` présents et non vides (selon zones).

Tuer le serveur.

- [ ] **Step 5: Aucun nouveau commit nécessaire si tout est propre**

Si des nettoyages mineurs ont été faits dans cette task, commiter :

```bash
git add -u
git commit -m "chore: nettoyage final (références mortes / types charts)"
```

Sinon, passer.

---

## Notes pour l'exécutant

- TDD est respecté à la Task 5 (test d'abord). Les autres tasks sont du refactor / suppression — pas de nouveau comportement testable au-delà du test pliable.
- Si une référence à `'velo-top-capteurs'` ou `'accidents-par-annee'` traîne dans `src/dashboard/ChartGrid.jsx`, c'est du code mort à supprimer (les types ne sont plus utilisés). Le faire en Task 7 Step 5.
- Le hook `useContours` reste — il charge les contours administratifs depuis DataHub (`FV_COMMU_S`).
- Le chargement autonome de `carrefours-feux` dans `DashboardPage` reste (DataHub `PC_CARF_P`).
