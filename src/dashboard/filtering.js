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

function fieldYear(properties, field) {
  const raw = properties?.[field]
  if (raw == null || raw === '') return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  return d.getFullYear()
}

// Étape 2 (géographique + temporel feature-level).
// zoneResolver  : (feature) => nom de zone | null ; repli sur properties.commune
// observation   : string (champ unique) ou { start, end } (intervalle)
//                 — la feature passe si son intervalle chevauche [from, to].
export function filterFeatures(features, filters, zoneResolver = null, observation = null) {
  const { zone = null, from = null, to = null } = filters
  let result = features
  if (zone) {
    if (zoneResolver) {
      result = result.filter((f) => zoneResolver(f) === zone)
    } else {
      result = result.filter((f) => (f.properties?.commune ?? null) === zone)
    }
  }
  if ((from != null || to != null) && observation) {
    result = result.filter((f) => {
      let s, e
      if (typeof observation === 'string') {
        s = e = fieldYear(f.properties, observation)
      } else {
        s = fieldYear(f.properties, observation.start)
        e = fieldYear(f.properties, observation.end)
        // Si une borne manque, on utilise l'autre comme point unique.
        if (s == null) s = e
        if (e == null) e = s
      }
      if (s == null && e == null) return true // date inconnue : on garde
      if (to != null && s != null && s > to) return false
      if (from != null && e != null && e < from) return false
      return true
    })
  }
  return result
}
