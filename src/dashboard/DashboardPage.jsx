import { useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { DOMAINES } from '../datasets/schema'
import { entriesForDomaine } from '../datasets/registry'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { useDatasets } from './useDatasets'
import { useContours } from './useContours'
import { selectDatasets, filterFeatures } from './filtering'
import { datasetDate, oldestDate } from './freshness'
import TopBar from './TopBar'
import FilterRail from './FilterRail'
import KpiRow from './KpiRow'
import ChartGrid from './ChartGrid'
import DashboardMap from './DashboardMap'
import LayerLegend from './LayerLegend'
import './dashboard.css'

function DashboardInner({ domaine }) {
  const { state } = useDashboard()
  const entries = useMemo(() => entriesForDomaine(domaine), [domaine])
  const datasetStates = useDatasets(entries)
  const { zoneNames, resolver: zoneResolver } = useContours()

  // Étape 1 : filtres dataset (catégorie + mode + temporel).
  const activeEntries = useMemo(
    () => selectDatasets(entries, state.filters),
    [entries, state.filters],
  )

  // Étape 2 : filtre géographique → features par jeu (uniquement les jeux 'pret').
  const activeLayers = useMemo(() => {
    return activeEntries
      .map((entry) => {
        const ds = datasetStates[entry.id]
        if (!ds || ds.status !== 'pret') return null
        const features = filterFeatures(ds.dataset.features, state.filters, zoneResolver)
        return { id: entry.id, libelle: entry.libelle, entry, dataset: ds.dataset, features }
      })
      .filter(Boolean)
  }, [activeEntries, datasetStates, state.filters, zoneResolver])

  // Lignes de légende : tous les jeux du domaine actif, avec leur état courant.
  const legendItems = useMemo(() => entries.map((entry) => {
    const ds = datasetStates[entry.id]
    const status = ds?.status ?? 'chargement'
    const layer = activeLayers.find((l) => l.id === entry.id)
    const count = layer ? layer.features.length : (ds?.dataset?.features?.length ?? 0)
    return { id: entry.id, libelle: entry.libelle, entry, status, count }
  }), [entries, datasetStates, activeLayers])

  // Options des filtres + compteurs par catégorie (issus des couches actives).
  const filterOptions = useMemo(() => {
    const categories = [...new Set(entries.map((e) => e.categorie))].sort()
    const modes = [...new Set(entries.flatMap((e) => e.mode))].sort()
    const annees = [...new Set(entries.map((e) => e.millesime).filter((m) => m != null))].sort()
    const zones = zoneNames // alimenté par les contours administratifs (FV_COMMU_S)
    const categoryCounts = {}
    activeLayers.forEach((l) => {
      const c = l.entry.categorie
      categoryCounts[c] = (categoryCounts[c] || 0) + l.features.length
    })
    return { categories, modes, annees, zones, categoryCounts }
  }, [entries, activeLayers, zoneNames])

  // KPIs : indicateurs synthétiques pour ce domaine.
  const stats = useMemo(() => {
    const loaded = Object.values(datasetStates).filter((d) => d.status === 'pret').length
    const errored = Object.values(datasetStates).filter((d) => d.status === 'erreur').length
    const features = activeLayers.reduce((n, l) => n + l.features.length, 0)
    return { loaded, errored, features, total: entries.length, visible: activeLayers.length }
  }, [datasetStates, activeLayers, entries.length])

  const kpis = useMemo(() => {
    const items = [
      { label: 'Jeux affichés', value: `${stats.visible} / ${stats.total}` },
      { label: 'Features cartographiées', value: stats.features.toLocaleString('fr-FR') },
      { label: 'Sources chargées', value: `${stats.loaded} / ${stats.total}` },
    ]
    if (stats.errored > 0) items.push({ label: 'Sources en erreur', value: stats.errored })
    return items
  }, [stats])

  // Répartition par mode (pour le diagramme circulaire).
  const modeDistribution = useMemo(() => {
    const acc = {}
    activeLayers.forEach((l) => {
      // si un jeu déclare plusieurs modes, on répartit également ses features.
      const ms = l.entry.mode || []
      if (!ms.length) return
      const share = l.features.length / ms.length
      ms.forEach((m) => { acc[m] = (acc[m] || 0) + share })
    })
    return Object.entries(acc).map(([mode, count]) => ({ mode, count: Math.round(count) })).filter((d) => d.count > 0)
  }, [activeLayers])

  // Top 10 jeux par volume.
  const topDatasets = useMemo(() => {
    return activeLayers
      .map((l) => ({ libelle: l.libelle, count: l.features.length }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [activeLayers])

  // Features par commune (top 12) — point-dans-polygone sur les contours.
  const featuresByZone = useMemo(() => {
    if (!zoneNames.length) return []
    const acc = {}
    activeLayers.forEach((layer) => {
      layer.features.forEach((f) => {
        const z = zoneResolver(f)
        if (z) acc[z] = (acc[z] || 0) + 1
      })
    })
    return Object.entries(acc)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [activeLayers, zoneResolver, zoneNames.length])

  const oldest = useMemo(
    () => oldestDate(activeLayers.map((l) => datasetDate(l.entry, l.dataset))),
    [activeLayers],
  )

  const charts = useMemo(() => [
    {
      key: 'features-par-commune',
      title: domaine === 'stationnement'
        ? 'Places de stationnement par commune (top 12)'
        : 'Features par commune (top 12)',
      status: featuresByZone.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'features-par-zone',
      data: featuresByZone,
    },
    {
      key: 'mode-distribution',
      title: 'Répartition par mode de transport',
      status: modeDistribution.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'mode-distribution',
      data: modeDistribution,
    },
    {
      key: 'top-datasets',
      title: 'Jeux de données par volume (top 10)',
      status: topDatasets.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'features-par-jeu',
      data: topDatasets,
    },
  ], [domaine, featuresByZone, modeDistribution, topDatasets, oldest])

  const empty = entries.length === 0

  return (
    <div className="dashboard">
      <TopBar domaine={domaine} oldestDate={oldest} />
      <div className="dashboard-body">
        <div className="dashboard-map">
          {empty
            ? <p className="state-msg">Aucune source configurée pour ce domaine.</p>
            : (
              <>
                <DashboardMap layers={activeLayers} />
                <LayerLegend items={legendItems} />
              </>
            )}
        </div>
        <div className="dashboard-analytics">
          {empty
            ? <p className="state-msg">Aucun indicateur disponible.</p>
            : (
              <>
                <KpiRow kpis={kpis} />
                <ChartGrid charts={charts} />
              </>
            )}
        </div>
        <FilterRail options={filterOptions} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { domaine } = useParams()
  if (!DOMAINES.includes(domaine)) return <Navigate to="/dashboard/mobilite" replace />
  // key force le remontage (et la réinitialisation du reducer) au changement de domaine.
  return (
    <DashboardProvider key={domaine} domaine={domaine}>
      <DashboardInner domaine={domaine} />
    </DashboardProvider>
  )
}
