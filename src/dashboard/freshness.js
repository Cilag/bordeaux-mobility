// Extrait la date d'un jeu de données depuis le champ déclaré dans le registre.
export function datasetDate(entry, dataset) {
  if (!entry.dateField) return null
  const raw = dataset?.features?.[0]?.properties?.[entry.dateField]
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

export function formatFreshness(date) {
  if (!date || isNaN(date.getTime())) return 'date inconnue'
  return date.toLocaleDateString('fr-FR')
}

// Date la plus ancienne d'une liste (les valeurs nulles/invalides sont ignorées).
export function oldestDate(dates) {
  const valid = dates.filter((d) => d instanceof Date && !isNaN(d.getTime()))
  if (valid.length === 0) return null
  return new Date(Math.min(...valid.map((d) => d.getTime())))
}
