// Pipeline de filtrage du dashboard — fonctions pures.

// Étape 1 (jeux désactivés + catégorie + mode + temporel) : quels jeux retenus.
// disabledIds : liste explicite des id désactivés (priorité haute)
// categories  : (legacy) filtre par catégorie
// modes       : modes de transport
// annee       : année exacte (filtre legacy)
// from / to   : plage d'années inclusive ; un jeu millésimé doit y être contenu
export function selectDatasets(entries, filters) {
  const { disabledIds = [], categories = [], modes = [], annee = null, from = null, to = null } = filters
  return entries.filter((e) => {
    if (disabledIds.includes(e.id)) return false
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

// Extrait toutes les années d'une valeur de date. Gère :
// - entier (année brute)
// - chaîne ISO "2024-05-01" ou "2024-05-01T10:00:00Z"
// - chaîne multi-valeurs séparée par '#' (convention Opendatasoft)
//   ex. "2025-11-05#2026-01-16" => [2025, 2026]
function extractYears(raw) {
  if (raw == null || raw === '') return []
  if (typeof raw === 'number' && raw >= 1900 && raw <= 2200) return [raw]
  const years = []
  for (const part of String(raw).split('#').map((s) => s.trim()).filter(Boolean)) {
    if (/^\d{4}$/.test(part)) {
      years.push(+part)
      continue
    }
    const d = new Date(part)
    if (!isNaN(d.getTime())) years.push(d.getFullYear())
  }
  return years
}

function fieldMinYear(properties, field) {
  const ys = extractYears(properties?.[field])
  return ys.length ? Math.min(...ys) : null
}
function fieldMaxYear(properties, field) {
  const ys = extractYears(properties?.[field])
  return ys.length ? Math.max(...ys) : null
}

// Étape 2 (géographique + temporel feature-level).
// zoneResolver  : (feature) => nom de zone | null ; repli sur properties.commune
// observation   : string (champ unique, traité comme intervalle [min,max] de ce champ)
//                 ou { start, end } (intervalle entre deux champs distincts)
//                 La feature passe si son intervalle [min(start),max(end)] chevauche [from,to].
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
    const startField = typeof observation === 'string' ? observation : observation.start
    const endField = typeof observation === 'string' ? observation : observation.end
    result = result.filter((f) => {
      const s = fieldMinYear(f.properties, startField)
      const e = fieldMaxYear(f.properties, endField)
      if (s == null && e == null) return true // date inconnue : on garde
      const lo = s ?? e
      const hi = e ?? s
      if (to != null && lo > to) return false
      if (from != null && hi < from) return false
      return true
    })
  }
  return result
}
