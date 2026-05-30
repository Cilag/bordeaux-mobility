import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'
import { makeZoneResolver, detectNameField } from './geo'

const CONTOURS_ENTRY = {
  id: 'contours-communes',
  source: { type: 'datahub-geojson', datahubId: 'FV_COMMU_S' },
}

// Charge les contours des communes de Bordeaux Métropole via useQuery.
// API inchangée vs. l'ancienne version.
export function useContours() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dataset', CONTOURS_ENTRY.id],
    queryFn: () => loadDataset(CONTOURS_ENTRY),
  })

  const features = useMemo(() => data?.features ?? [], [data])

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

  return {
    zones: features,
    zoneNames,
    nameField,
    resolver,
    isPending,
    isError,
    error: isError ? (error?.message ?? 'Erreur de chargement des contours') : null,
  }
}
