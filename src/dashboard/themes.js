// Thèmes : regroupent les catégories par sujet, et fournissent une couleur cohérente.
// Cette correspondance pilote la couleur des couches sur la carte, la légende et
// le regroupement des catégories dans le rail de filtres.

export const THEMES = [
  { id: 'capteurs',         label: 'Capteurs & comptage',            color: '#0EA5B6', categories: ['capteurs', 'comptage'] },
  { id: 'reseau',           label: 'Réseau de transport',            color: '#1E3A5F', categories: ['arrets', 'carrefours', 'reseau-bus', 'voirie'] },
  { id: 'mobilites-douces', label: 'Mobilités douces',               color: '#2C8C5C', categories: ['velo-libre-service', 'amenagement-cyclable', 'services-velo', 'itinerance', 'freefloating'] },
  { id: 'electromobilite',  label: 'Autopartage & électromobilité',  color: '#7C5DC3', categories: ['autopartage', 'irve', 'mobilite-alternative'] },
  { id: 'perturbations',    label: 'Perturbations & travaux',        color: '#C0772A', categories: ['perturbations'] },
  { id: 'securite',         label: 'Sécurité',                       color: '#B83D2E', categories: ['securite'] },
  { id: 'reglementation',   label: 'Réglementation',                 color: '#6B5B95', categories: ['zfe'] },
  { id: 'stat-vehicules',   label: 'Stationnement véhicules',        color: '#B5651D', categories: ['parking-ouvrage', 'parking-payant', 'parking-pmr', 'parking-2roues', 'parking-tarifs'] },
  { id: 'stat-velo',        label: 'Stationnement vélo',             color: '#3F8F3F', categories: ['parking-velo'] },
]

export const FALLBACK_THEME = { id: 'autre', label: 'Autres', color: '#6B7280', categories: [] }

const CATEGORY_INDEX = {}
THEMES.forEach((t) => t.categories.forEach((c) => { CATEGORY_INDEX[c] = t }))

export function themeForCategory(categorie) {
  return CATEGORY_INDEX[categorie] || FALLBACK_THEME
}

export function themeForEntry(entry) {
  return themeForCategory(entry?.categorie)
}
