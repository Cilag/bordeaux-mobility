import { useMemo } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { DOMAINES } from '../datasets/schema'
import { entriesForDomaine } from '../datasets/registry'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { useDatasets } from './useDatasets'
import { selectDatasets, filterFeatures } from './filtering'
import { datasetDate, oldestDate } from './freshness'
import TopBar from './TopBar'
import FilterRail from './FilterRail'
import KpiRow from './KpiRow'
import ChartGrid from './ChartGrid'
import DashboardMap from './DashboardMap'
import './dashboard.css'

function DashboardInner({ domaine }) {
  const { state } = useDashboard()
  const entries = useMemo(() => entriesForDomaine(domaine), [domaine])
  const datasetStates = useDatasets(entries)

  // Étape 1 : filtre catégorie + mode + temporel → quels jeux.
  const activeEntries = useMemo(
    () => selectDatasets(entries, state.filters),
    [entries, state.filters],
  )

  // Étape 2 : filtre géographique → quelles features par jeu.
  const activeLayers = useMemo(() => {
    return activeEntries
      .map((entry) => {
        const ds = datasetStates[entry.id]
        if (!ds || ds.status !== 'pret') return null
        const features = filterFeatures(ds.dataset.features, state.filters)
        return { id: entry.id, libelle: entry.libelle, entry, dataset: ds.dataset, features }
      })
      .filter(Boolean)
  }, [activeEntries, datasetStates, state.filters])

  // Options des filtres dérivées des jeux chargés.
  const filterOptions = useMemo(() => {
    const categories = [...new Set(entries.map((e) => e.categorie))].sort()
    const modes = [...new Set(entries.flatMap((e) => e.mode))].sort()
    const annees = [...new Set(entries.map((e) => e.millesime).filter((m) => m != null))].sort()
    const zones = [...new Set(
      Object.values(datasetStates)
        .filter((d) => d.status === 'pret')
        .flatMap((d) => d.dataset.features.map((f) => f.properties?.commune))
        .filter(Boolean),
    )].sort()
    return { categories, modes, annees, zones }
  }, [entries, datasetStates])

  const kpis = useMemo(() => [
    { label: 'Jeux actifs', value: activeLayers.length },
    { label: 'Features affichées', value: activeLayers.reduce((n, l) => n + l.features.length, 0) },
    {
      label: 'Données chargées',
      value: `${Object.values(datasetStates).filter((d) => d.status === 'pret').length}/${entries.length}`,
    },
  ], [activeLayers, datasetStates, entries.length])

  const charts = useMemo(() => [{
    key: 'features-par-jeu',
    title: 'Nombre de features par jeu de données',
    status: activeLayers.length === 0 ? 'vide' : 'pret',
    date: oldestDate(activeLayers.map((l) => datasetDate(l.entry, l.dataset))),
    type: 'features-par-jeu',
    data: activeLayers.map((l) => ({ libelle: l.libelle, count: l.features.length })),
  }], [activeLayers])

  const globalOldest = useMemo(
    () => oldestDate(activeLayers.map((l) => datasetDate(l.entry, l.dataset))),
    [activeLayers],
  )

  const empty = entries.length === 0

  return (
    <div className="dashboard">
      <TopBar domaine={domaine} oldestDate={globalOldest} />
      <div className="dashboard-body">
        <div className="dashboard-map">
          {empty
            ? <p className="state-msg">Aucune source configurée pour ce domaine — en attente des identifiants DataHub.</p>
            : <DashboardMap layers={activeLayers} />}
        </div>
        <div className="dashboard-analytics">
          {empty
            ? <p className="state-msg">Aucun indicateur disponible : ce domaine n'a pas encore de jeu de données.</p>
            : <>
                <KpiRow kpis={kpis} />
                <ChartGrid charts={charts} />
              </>}
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
