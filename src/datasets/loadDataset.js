// queryFn utilisée par TanStack Query (useQuery / useQueries) pour charger
// un GeoJSON depuis le proxy /api/datahub ou /api/opendata. Pas de cache
// propre : TanStack Query s'en charge. Pas de gestion de retry : idem.
// L'appelant qui veut savoir si un retry a sauvé peut lire query.failureCount.

function buildUrl(source) {
  if (source.type === 'datahub-geojson') {
    return `/api/datahub/geojson/features/${source.datahubId}`
  }
  if (source.type === 'opendatasoft') {
    return `/api/opendata/api/explore/v2.1/catalog/datasets/${source.datasetId}/exports/geojson`
  }
  throw new Error(`type de source non supporté: ${source.type}`)
}

export async function loadDataset(entry) {
  const response = await fetch(buildUrl(entry.source))
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const geojson = await response.json()
  return { features: geojson?.features ?? [] }
}
