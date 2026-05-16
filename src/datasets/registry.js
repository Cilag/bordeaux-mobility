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
