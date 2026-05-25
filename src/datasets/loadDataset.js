const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY
const cache = new Map()

function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}?key=${DATAHUB_KEY}`
  }
  if (source.type === 'opendatasoft') {
    return `/api/opendata/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

// Charge un jeu de données et met le résultat en cache mémoire (clé = entry.id).
// fetchImpl est injectable pour les tests.
export async function loadDataset(entry, { fetchImpl = fetch } = {}) {
  if (cache.has(entry.id)) return cache.get(entry.id)
  const res = await fetchImpl(buildUrl(entry.source))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const geojson = await res.json()
  const result = { features: geojson.features ?? [] }
  cache.set(entry.id, result)
  return result
}

export function clearDatasetCache() {
  cache.clear()
}
