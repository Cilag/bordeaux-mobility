# Design — Dashboard Mobilité & Stationnement (Bordeaux Métropole)

Date : 2026-05-16
Statut : validé en brainstorming, en attente de relecture utilisateur

## Objectif

Remplacer l'application carte temps réel actuelle par une application **dashboard
d'aide à la décision** destinée aux aménageurs et élus de Bordeaux Métropole.
Le dashboard doit être épuré, filtrable, cartographié et instrumenté de diagrammes
pertinents sur les enjeux de mobilité et de stationnement. La structure de données
est enrichie et scindée en deux domaines : **Mobilité** et **Stationnement**.

Public cible : aide à la décision (agents/élus) — diagrammes denses, comparaisons,
indicateurs offre vs demande.

## Décisions de cadrage (issues du brainstorming)

- L'app actuelle est **remplacée entièrement**. Les couches temps réel sont
  conservées mais reléguées à un **mode « Live »** secondaire.
- Interface : une **bascule globale `Stationnement | Mobilité`** change tout le
  contenu du dashboard.
- **25 jeux de données** intégrés en une seule fois (périmètre complet).
- Filtres : **4 dimensions** — géographique, temporel, catégorie de données, mode
  de transport.
- Les identifiants/URLs DataHub des 25 jeux sont **fournis par l'utilisateur**.
- Mise en page retenue : **layout B — split équilibré** (carte à gauche, colonne
  analytique au centre, rail de filtres à droite).
- Architecture data : **approche hybride** — registre déclaratif pour les jeux
  analytiques + hooks de polling dédiés pour les couches temps réel.
- Librairie de diagrammes : **Recharts**.

## Section 1 — Architecture d'ensemble

Application à deux modes :

- **Mode Dashboard** (défaut) — écran analytique avec bascule globale
  `Stationnement | Mobilité`.
- **Mode Live** (secondaire) — la carte temps réel actuelle conservée sans
  modification fonctionnelle (trams/bus, SNCF, vols OpenSky, trafic TomTom),
  accessible depuis un bouton du bandeau.

Navigation : ajout de `react-router-dom`, trois routes :

- `/` — redirige vers le dernier domaine du dashboard.
- `/dashboard/:domaine` — `:domaine` ∈ `{mobilite, stationnement}`.
- `/live` — mode Live.

URLs propres → une vue est partageable entre aménageurs.

Organisation des fichiers :

```
src/
  datasets/     registry.js (catalogue des 25 jeux) + loaders génériques
  dashboard/    layout B, filtres, KPIs, diagrammes
  live/         app carte actuelle déplacée ici (MapView + couches temps réel)
  shared/       carte Leaflet réutilisable, composants UI communs
```

Le code temps réel existant (`useTBM`, `useVCub`, `useSNCF`, `useOpenSky`,
`useTrafficLights`, layers et panels associés) est **déplacé** sous `live/` sans
modification fonctionnelle. Les tests existants suivent ce déplacement.

## Section 2 — Couche de données

### Registre déclaratif

`src/datasets/registry.js` — une entrée par jeu de données :

```js
{
  id: 'capteur-trafic-velo',
  domaine: 'mobilite',              // 'mobilite' | 'stationnement'
  libelle: 'Capteurs de trafic vélo',
  source: { type: 'datahub-geojson', datahubId: 'XXX' }, // ID fourni par l'utilisateur
  geometrie: 'point',               // 'point' | 'ligne' | 'polygone'
  mode: ['velo'],                   // pieton | velo | bus_tram | voiture | autopartage | freefloating
  categorie: 'capteurs',
  dateField: 'mdate',               // champ portant la date / dernière mise à jour
  millesime: null,                  // année si jeu explicitement millésimé (ex. 2019, 2025)
  viz: ['carte', 'kpi-comptage'],   // comment le jeu alimente le dashboard
}
```

### Loaders (approche hybride)

- `loadDataset(entry)` — loader générique : fetch DataHub GeoJSON → conserve la
  `FeatureCollection` brute (géométrie imbriquée requise par le composant Leaflet
  `<GeoJSON>` ; pas de `flattenGeoJSON`, contrairement au code temps réel) → met
  le résultat en **cache mémoire** (les données analytiques sont quasi-statiques,
  pas de polling).
- Les hooks de polling temps réel restent dédiés, sous `live/`.

### Répartition des 25 jeux

**Mobilité (19)** : capteurs de trafic piéton / routier ponctuel / vélo,
comptage du trafic, couloir de bus, déviation programmée, emplacement
freefloating, emprises associées aux chantiers, événements impactant la
circulation, ligne commerciale, lieux publics desservis par des arrêts,
mobilité alternative 2019, mobilité alternative (actuelle), offres de services
bus/tram/scolaire, géométrie d'une voie, point d'accès autopartage, véhicules en
autopartage, point de charge IRVE, schéma directeur IRVE.

**Stationnement (6)** : parking hors voirie, emplacement 2-roues motorisés sans
arceaux, parkings données techniques 2025/2026, parking tarifs 2025/2026, places
de stationnement PMR par quartier, voies en stationnement payant.

Note : IRVE (recharge électrique) est classé en *Mobilité*. La catégorisation
`mode` / `categorie` sera affinée à la réception des sources exactes.

## Section 3 — Mise en page & composants (layout B)

**Bandeau supérieur** (`TopBar`) : titre + bascule `Stationnement | Mobilité`
(segmented control) + bouton `Mode Live` + horodatage global de fraîcheur.

Trois zones sous le bandeau :

- **Gauche — Carte** (`DashboardMap`) : carte Leaflet partagée. Couches GeoJSON
  des jeux actifs (points/lignes/polygones selon `geometrie`). Légende, popups au
  clic. Recadrage selon le filtre géographique.
- **Centre — Colonne analytique** (défilante) :
  - `KpiRow` — 3-4 cartes KPI (ex. nb de capteurs, places de stationnement
    totales, % évolution mobilité alternative 2019→actuelle).
  - `ChartGrid` — diagrammes Recharts selon le domaine actif (barres comparatives
    par quartier, séries temporelles de comptage, répartition par mode, etc.).
- **Droite — Rail de filtres** (`FilterRail`) : les 4 filtres — géographique
  (commune/quartier), temporel (année/période), catégorie de données (cases à
  cocher par jeu/sous-thème), mode de transport.

Composants génériques réutilisables :

- `GeoJsonLayer` — rendu d'un jeu selon sa géométrie (remplace les couches
  une-par-source).
- `DatasetCard` / `ChartCard` — conteneur avec titre + **date du jeu de données**
  (badge de fraîcheur).
- `KpiCard`, `ChartGrid`.

État : un `DashboardContext` (`useReducer`) porte le domaine actif + l'état des 4
filtres ; carte et diagrammes y sont abonnés.

## Section 4 — Flux de données & filtrage

### Chargement

1. Au démarrage du dashboard, le registre est lu ; les jeux du domaine actif sont
   chargés via `loadDataset` en parallèle.
2. Chaque résultat est mis en cache mémoire (clé = `id`). Changer de domaine puis
   revenir ne recharge pas.
3. Chaque jeu expose son état : `chargement | prêt | erreur` + sa date de données.

### Application des filtres (dérivation, pas de re-fetch)

- **Catégorie de données** → quels jeux sont visibles (couches carte +
  diagrammes).
- **Mode de transport** → ne garde que les jeux dont le champ `mode` correspond.
- **Géographique** (commune/quartier) → filtre les features par appartenance à la
  zone ; recadre la carte ; les diagrammes recalculent leurs agrégats.
- **Temporel** (année/période) → filtre les features datées et pilote les
  comparaisons (mobilité alternative 2019 vs actuelle, tarifs 2025 vs 2026).

Pipeline : `jeux chargés` → `filtre catégorie+mode` (quels jeux) →
`filtre géo+temps` (quelles features) → `données dérivées` consommées par la
carte et chaque diagramme. Recalcul mémoïsé (`useMemo`) à chaque changement de
filtre.

### Découpage géographique

Le filtre commune/quartier s'appuie sur un jeu de contours administratifs de
Bordeaux Métropole (à inclure dans les sources fournies par l'utilisateur). Le
rattachement d'une feature à une zone se fait par test point-dans-polygone, ou
via un champ commune/quartier déjà présent dans le jeu quand il existe.

## Section 5 — Gestion d'erreurs & fraîcheur des données

### Erreurs par jeu de données (isolation)

L'échec d'un jeu n'empêche pas les autres. Chaque `DatasetCard` / couche affiche
son propre état :

- *chargement* → squelette discret.
- *erreur* → message court dans la carte concernée (« Source indisponible »), le
  reste du dashboard fonctionne.
- *vide après filtrage* → état vide explicite (« Aucune donnée pour cette
  zone/période »).

### Dates des jeux de données

- Chaque jeu porte une date issue de son `dateField` (date de référence ou
  dernière mise à jour selon la source).
- Affichée comme **badge de fraîcheur** sur chaque `ChartCard` / `DatasetCard` et
  dans la légende de carte.
- Le bandeau supérieur affiche la date la plus ancienne parmi les jeux actifs,
  pour signaler une analyse reposant sur des données anciennes.
- Jeux explicitement millésimés (mobilité alternative 2019, parkings/tarifs
  2025-2026) : le millésime est une métadonnée du registre, exploitée par le
  filtre temporel.
- Garde-fou : un jeu sans `dateField` exploitable affiche « date inconnue »
  plutôt que de planter.

## Section 6 — Tests

Cadre conservé : **Vitest + Testing Library** (déjà en place).

Tests unitaires :

- `registry` — chaque entrée a les champs requis ; domaines/modes/catégories
  valides ; pas d'`id` dupliqué.
- `loadDataset` — parsing GeoJSON → objets plats, mise en cache, propagation
  d'erreur.
- Logique de filtrage — pipeline catégorie → mode → géo → temps sur des jeux
  factices ; agrégats des diagrammes ; rattachement point-dans-polygone.
- Dérivation des dates / badge de fraîcheur.

Tests composants :

- `FilterRail` — interactions sur les 4 filtres mettent à jour l'état.
- `TopBar` — la bascule de domaine change le contenu.
- `DatasetCard` / `ChartCard` — états chargement / erreur / vide / date affichée.
- `KpiCard` + un diagramme Recharts représentatif (rendu sans crash, valeurs
  correctes).

Tests existants : ceux des hooks temps réel (`useTBM`, `useVCub`, etc.) sont
conservés et déplacés avec le code sous `live/`.

Pas de tests E2E (hors périmètre). La validation visuelle du dashboard se fait
dans le navigateur via `npm run dev`.

## Hors périmètre

- Tests end-to-end.
- Synchronisation de l'état des filtres dans l'URL (au-delà du mode/domaine).
- Persistance / backend : tout est chargé depuis les API DataHub côté client.

## Dépendances à ajouter

- `react-router-dom` — navigation à deux modes.
- `recharts` — diagrammes.

## Prérequis utilisateur

- Liste des identifiants/URLs DataHub des 25 jeux de données.
- Source des contours administratifs (commune/quartier) de Bordeaux Métropole
  pour le filtre géographique.
