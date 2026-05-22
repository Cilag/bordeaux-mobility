import { useState, useEffect, useMemo } from 'react'
import { loadDataset } from '../datasets/loadDataset'
import { makeZoneResolver, detectNameField } from './geo'

const CONTOURS_ENTRY = {
  id: 'contours-communes',
  source: { type: 'datahub-geojson', datahubId: 'FV_COMMU_S' },
}

// Charge les contours des communes de Bordeaux Métropole et fournit :
// - zones      : la liste de features (Polygon/MultiPolygon)
// - zoneNames  : la liste triée des noms de communes (pour le filtre)
// - nameField  : le champ détecté qui porte le nom
// - resolver   : (feature) => nom de commune | null (point-dans-polygone)
export function useContours() {
  const [features, setFeatures] = useState([])

  useEffect(() => {
    let cancelled = false
    loadDataset(CONTOURS_ENTRY)
      .then((ds) => { if (!cancelled) setFeatures(ds.features ?? []) })
      .catch(() => { if (!cancelled) setFeatures([]) })
    return () => { cancelled = true }
  }, [])

  const nameField = useMemo(() => detectNameField(features), [features])

  const zoneNames = useMemo(() => {
    if (!nameField) return []
    return [...new Set(features.map((f) => f.properties?.[nameField]).filter(Boolean))].sort()
  }, [features, nameField])

  const resolver = useMemo(
    () => (nameField ? makeZoneResolver(features, nameField) : () => null),
    [features, nameField],
  )

  return { zones: features, zoneNames, nameField, resolver }
}
