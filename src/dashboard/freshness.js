// Extrait la date d'un jeu de données.
// 1) Lit le champ déclaré dans `dateField` sur la première feature ;
// 2) Si absent / invalide, replie sur `staticDate` du registre (date de
//    modification figée pour les jeux Opendatasoft sans champ date).
export function datasetDate(entry, dataset) {
  if (entry?.dateField) {
    const raw = dataset?.features?.[0]?.properties?.[entry.dateField]
    if (raw) {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d
    }
  }
  if (entry?.staticDate) {
    const d = new Date(entry.staticDate)
    if (!isNaN(d.getTime())) return d
  }
  return null
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
