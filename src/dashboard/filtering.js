// Pipeline de filtrage du dashboard — fonctions pures.

// Étape 1 (catégorie + mode + temporel) : quels jeux de données sont retenus.
// annee : année exacte (filtre legacy)
// from / to : plage d'années inclusive ; un jeu millésimé doit y être contenu
export function selectDatasets(entries, filters) {
  const { categories = [], modes = [], annee = null, from = null, to = null } = filters
  return entries.filter((e) => {
    if (categories.length && !categories.includes(e.categorie)) return false
    if (modes.length && !e.mode.some((m) => modes.includes(m))) return false
    if (annee && e.millesime != null && e.millesime !== annee) return false
    if (e.millesime != null) {
      if (from != null && e.millesime < from) return false
      if (to != null && e.millesime > to) return false
    }
    return true
  })
}

// Année extraite d'un champ de date arbitraire (ISO string, timestamp, etc.).
function featureYear(feature, dateField) {
  const raw = feature?.properties?.[dateField]
  if (raw == null || raw === '') return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.getFullYear()
}

// Étape 2 (géographique + temporel feature-level).
// zoneResolver : (feature) => nom de zone | null ; repli sur properties.commune
// dateField : nom du champ de date dans properties (utilisé avec from/to)
export function filterFeatures(features, filters, zoneResolver = null, dateField = null) {
  const { zone = null, from = null, to = null } = filters
  let result = features
  if (zone) {
    if (zoneResolver) {
      result = result.filter((f) => zoneResolver(f) === zone)
    } else {
      result = result.filter((f) => (f.properties?.commune ?? null) === zone)
    }
  }
  if ((from != null || to != null) && dateField) {
    result = result.filter((f) => {
      const y = featureYear(f, dateField)
      if (y === null) return true // date inconnue : on garde
      if (from != null && y < from) return false
      if (to != null && y > to) return false
      return true
    })
  }
  return result
}
