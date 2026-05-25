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

  const resolver = useMemo(() => {
    const base = nameField ? makeZoneResolver(features, nameField) : () => null
    // Priorité au champ `commune` quand il est déjà présent sur la feature :
    // les données DataHub portent souvent cette information à la source, ce
    // qui est plus rapide et plus fiable que le point-dans-polygone.
    return (feature) => {
      const fromProp = feature?.properties?.commune
      if (typeof fromProp === 'string' && fromProp.trim() !== '') return fromProp
      return base(feature)
    }
  }, [features, nameField])

  return { zones: features, zoneNames, nameField, resolver }
}
