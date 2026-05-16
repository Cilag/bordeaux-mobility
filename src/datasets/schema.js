export const DOMAINES = ['mobilite', 'stationnement']
export const MODES = ['pieton', 'velo', 'bus_tram', 'voiture', 'autopartage', 'freefloating']
export const GEOMETRIES = ['point', 'ligne', 'polygone']

// Returns an array of human-readable error strings. Empty array = valid.
export function validateEntry(entry) {
  const errors = []
  if (!entry.id) errors.push('id manquant')
  if (!DOMAINES.includes(entry.domaine)) errors.push(`domaine invalide: ${entry.domaine}`)
  if (!entry.libelle) errors.push('libelle manquant')
  if (!GEOMETRIES.includes(entry.geometrie)) errors.push(`geometrie invalide: ${entry.geometrie}`)
  if (!Array.isArray(entry.mode)) {
    errors.push('mode doit être un tableau')
  } else {
    for (const m of entry.mode) {
      if (!MODES.includes(m)) errors.push(`mode invalide: ${m}`)
    }
  }
  if (!entry.categorie) errors.push('categorie manquante')
  return errors
}
