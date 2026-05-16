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
