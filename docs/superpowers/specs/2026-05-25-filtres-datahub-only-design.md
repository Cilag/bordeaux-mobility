# Filtres DataHub uniquement + refonte UX du dashboard

Date : 2026-05-25
Statut : validé pour implémentation

## Objectif

Recentrer le dashboard sur les seules APIs DataHub Bordeaux Métropole
(`data.bordeaux-metropole.fr` — couches WFS GeoJSON), supprimer toutes les
sources Opendatasoft et leurs graphiques dépendants, et refondre la
disposition pour mettre en avant le couple « filtres + carte », avec les
graphiques en dessous.

## Périmètre

### Hors périmètre

- Pas de changement sur la TopBar, la Timeline, le chargement des contours
  administratifs (`useContours`), ni sur le composant `DashboardMap`.
- Pas d'ajout d'API hors DataHub.

### Dans le périmètre

1. **Registry** : ne garder que les entrées dont `source.type === 'datahub-geojson'`.
2. **Code applicatif** : retirer les hooks / calculs / graphiques qui dépendaient
   des sources Opendatasoft supprimées.
3. **Layout** : passer d'un layout 3 colonnes à un layout 2 lignes
   (rangée haute `[Filtres | Carte]`, rangée basse `[Graphiques pleine largeur]`).
4. **FilterRail** : groupes pliables, en-têtes plus lisibles, séparation visuelle
   plus marquée, statut global en haut.
5. **Tests** : adapter `FilterRail.test.jsx` et `dashboardReducer.test.js` aux
   nouvelles signatures et au comportement « pliable ». Conserver une couverture
   équivalente (toggle dataset, reset, toggle thème).

## Détail

### 1. Registry (`src/datasets/registry.js`)

Entrées **supprimées** (16 au total) :

- Mobilité : `chantiers-actifs`, `comptage-trafic`, `mobilite-alternative-2019`,
  `irve-schema-directeur`, `vehicules-autopartage`, `voies-noms`,
  `reve-itineraires`, `lieux-desservis`, `arret-lieu-relations`,
  `lignes-commerciales`, `vitesses-radars`, `zones-reglementaires`,
  `accidents-corporels`.
- Stationnement : `stationnement-payant`, `parkings-techniques`,
  `parkings-tarifs`.

Restent **31 entrées** (toutes `datahub-geojson`) : 26 mobilité + 5 stationnement.

### 2. Code applicatif (`src/dashboard/DashboardPage.jsx`)

Supprimer :

- L'import et l'utilisation de `useBikeUsage` ; supprimer le fichier
  `src/dashboard/useBikeUsage.js`.
- Les `useMemo` : `trafficTopRoads`, `peakHoursByRoad`, `accidentsByVehicle`,
  `accidentsByYear`.
- Les entrées du tableau `charts` : `velo-top-capteurs`, `trafic-top-voies`,
  `peak-hours`, `accidents-par-annee`, `accidents-par-vehicule`.

Conserver :

- Chargement autonome de `carrefours-feux` (déjà DataHub WFS `PC_CARF_P`).
- Graphiques DataHub : `irve-par-commune`, `bus-km-par-commune`,
  `amenagements-par-annee`, `amenagements-km-par-commune` (mobilité),
  `capacite-par-commune`, `top-parkings`, `offre-demande` (stationnement),
  `features-par-commune`, `mode-distribution`, `top-datasets` (communs).

### 3. Layout (`src/dashboard/dashboard.css` + `DashboardPage.jsx`)

Nouvelle structure DOM :

```
<div class="dashboard">
  <TopBar />
  <Timeline />
  <div class="dashboard-top">    <!-- grid 2 cols -->
    <FilterRail />               <!-- 320px -->
    <div class="dashboard-map">  <!-- flex:1 -->
      <DashboardMap />
      <LayerLegend />
    </div>
  </div>
  <div class="dashboard-bottom"> <!-- pleine largeur -->
    <KpiRow />
    <ChartGrid />
  </div>
</div>
```

CSS clés :

- `.dashboard-top { display: grid; grid-template-columns: 320px 1fr; min-height: 60vh; }`
- `.dashboard-bottom { padding: 1rem; background: #f4f6f8; }`
- `.chart-grid` : passe en `display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1rem;`
- Le `FilterRail` reçoit `border-right` au lieu de `border-left`.

### 4. Refonte FilterRail (`src/dashboard/FilterRail.jsx`)

Nouveaux comportements :

- **Pliable par groupe** : état local `collapsedGroups: Set<string>`. Cliquer
  sur l'en-tête (zone hors boutons) plie/déplie. Chevron `›` (replié) / `⌄` (déplié).
- **Boutons d'en-tête** : remplacer la pill `Tout/Aucun` par 2 boutons texte
  `Tout` et `Aucun` côte à côte, taille lisible (font-size 0.72rem, padding 4×8).
- **Compteur de groupe** : `(actifs/total)` au lieu du simple total.
  Ex : `3 / 7`.
- **Statut global en haut** : ligne `X jeux affichés sur 31` sous le titre,
  bouton `Réinitialiser` mis en évidence (fond bleu pâle).
- **Compteur de features par jeu** : reste à droite, couleur `#9aa5b1` (gris clair).
- **Séparateurs** : `<hr>` entre les `<fieldset>` n'est pas nécessaire ;
  augmenter `margin-top` des fieldsets et garder les `border + border-radius`.

Pas de barre de recherche dans cette itération (YAGNI à 31 jeux avec groupes pliables).

### 5. Tests

`src/__tests__/dashboard/FilterRail.test.jsx`

- Les tests existants restent valides (cocher/décocher, mode, zone, reset).
- Ajouter un test : « cliquer sur l'en-tête d'un groupe le plie (les checkbox
  ne sont plus visibles) ; recliquer le déplie ».

`src/__tests__/dashboard/dashboardReducer.test.js`

- Aucun changement nécessaire (le reducer ne change pas).

### 6. Risques et points d'attention

- Plusieurs fichiers de tests Charts pourraient référencer les datasets
  supprimés — à scanner et adapter / supprimer.
- Le composant `Timeline` n'est plus utile si plus aucun dataset n'a de filtrage
  `observationField` actif. Vérification : les jeux DataHub conservés
  `deviations` (`debut`/`fin`) et `evenements-circulation` (`date_debut`/`date_fin`)
  ont toujours un `observationField` → Timeline reste utile.
- Le `useBikeUsage` est testé ? Si oui, supprimer le test.

## Critères de succès

- `npx vitest run` passe entièrement.
- Le rail de filtres ne montre que les 31 jeux DataHub.
- La page dashboard a la disposition `[Filtres | Carte]` au-dessus et
  les graphiques en bas, sans chevauchement ni scroll horizontal.
- Les groupes thèmes peuvent être pliés/dépliés au clic.
- Aucun appel réseau ne part vers `opendata.bordeaux-metropole.fr` au chargement.
