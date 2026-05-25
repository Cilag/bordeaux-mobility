import { useMemo, useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { DOMAINES } from '../datasets/schema'
import { entriesForDomaine } from '../datasets/registry'
import { loadDataset } from '../datasets/loadDataset'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { useDatasets } from './useDatasets'
import { useContours } from './useContours'
import { useBikeUsage } from './useBikeUsage'
import { featureLengthKm } from './geo'
import { selectDatasets, filterFeatures } from './filtering'
import { datasetDate, oldestDate } from './freshness'
import TopBar from './TopBar'
import FilterRail from './FilterRail'
import KpiRow from './KpiRow'
import ChartGrid from './ChartGrid'
import DashboardMap from './DashboardMap'
import LayerLegend from './LayerLegend'
import Timeline from './Timeline'
import './dashboard.css'

const TIMELINE_MIN = 2012
const TIMELINE_MAX = 2026

function DashboardInner({ domaine }) {
  const { state } = useDashboard()
  const entries = useMemo(() => entriesForDomaine(domaine), [domaine])
  const datasetStates = useDatasets(entries)
  const { zoneNames, resolver: zoneResolver } = useContours()
  const bikeUsage = useBikeUsage({ from: state.filters.from, to: state.filters.to })

  // Carrefours à feux chargés de façon autonome — sert de proxy de "demande"
  // dans le diagramme offre/demande, et reste disponible quand on est sur
  // le domaine Stationnement (où carrefours-feux n'appartient pas).
  const [carrefoursFeatures, setCarrefoursFeatures] = useState([])
  useEffect(() => {
    let cancelled = false
    loadDataset({ id: 'carrefours-feux', source: { type: 'datahub-geojson', datahubId: 'PC_CARF_P' } })
      .then((d) => { if (!cancelled) setCarrefoursFeatures(d.features ?? []) })
      .catch(() => { if (!cancelled) setCarrefoursFeatures([]) })
    return () => { cancelled = true }
  }, [])

  // Étape 1 : filtres dataset (catégorie + mode + temporel).
  const activeEntries = useMemo(
    () => selectDatasets(entries, state.filters),
    [entries, state.filters],
  )

  // Étape 2 : filtre géographique + temporel → features par jeu (uniquement les jeux 'pret').
  const activeLayers = useMemo(() => {
    return activeEntries
      .map((entry) => {
        const ds = datasetStates[entry.id]
        if (!ds || ds.status !== 'pret') return null
        // observationField : seul un sous-ensemble de jeux ont une date « événement »
        // par feature (ex. accidents) ; pour l'inventaire on n'applique pas le filtre
        // temporel feature-à-feature pour ne pas vider la carte par effet de bord.
        const features = filterFeatures(ds.dataset.features, state.filters, zoneResolver, entry.observationField || null)
        return { id: entry.id, libelle: entry.libelle, entry, dataset: ds.dataset, features }
      })
      .filter(Boolean)
  }, [activeEntries, datasetStates, state.filters, zoneResolver])

  // Lignes de légende : tous les jeux du domaine actif, avec leur état courant
  // et la date du jeu (issue du champ dateField si le jeu est chargé).
  const legendItems = useMemo(() => entries.map((entry) => {
    const ds = datasetStates[entry.id]
    const status = ds?.status ?? 'chargement'
    const layer = activeLayers.find((l) => l.id === entry.id)
    const count = layer ? layer.features.length : (ds?.dataset?.features?.length ?? 0)
    const date = ds?.dataset ? datasetDate(entry, ds.dataset) : null
    return { id: entry.id, libelle: entry.libelle, entry, status, count, date }
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

  // Top voies les plus fréquentées — basé sur le comptage du trafic (mjo_val).
  // Agrège par nom de voie (les capteurs des 2 sens partagent souvent le même nom).
  const trafficTopRoads = useMemo(() => {
    const comptage = activeLayers.find((l) => l.id === 'comptage-trafic')
    if (!comptage) return []
    const agg = {}
    comptage.features.forEach((f) => {
      const name = f.properties?.nom_voie
      const mjo = f.properties?.mjo_val
      if (!name || typeof mjo !== 'number') return
      if (!agg[name]) agg[name] = { nom_voie: name, mjo: 0, hpm: 0, hps: 0 }
      agg[name].mjo += mjo
      agg[name].hpm += f.properties?.hpm_val || 0
      agg[name].hps += f.properties?.hps_val || 0
    })
    return Object.values(agg)
      .sort((a, b) => b.mjo - a.mjo)
      .slice(0, 15)
      .map((d) => ({ ...d, mjo: Math.round(d.mjo), hpm: Math.round(d.hpm), hps: Math.round(d.hps) }))
  }, [activeLayers])

  // Heures de pointe matin (hpm_val) et soir (hps_val) pour les voies les plus chargées.
  const peakHoursByRoad = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'comptage-trafic')
    if (!layer || !layer.features.length) return []
    const agg = {}
    layer.features.forEach((f) => {
      const name = f.properties?.nom_voie
      const hpm = Number(f.properties?.hpm_val) || 0
      const hps = Number(f.properties?.hps_val) || 0
      if (!name || (hpm === 0 && hps === 0)) return
      if (!agg[name]) agg[name] = { nom_voie: name, hpm: 0, hps: 0 }
      agg[name].hpm += hpm
      agg[name].hps += hps
    })
    return Object.values(agg)
      .map((d) => ({ ...d, max: Math.max(d.hpm, d.hps) }))
      .sort((a, b) => b.max - a.max)
      .slice(0, 12)
      .map((d) => ({ nom_voie: d.nom_voie, hpm: Math.round(d.hpm), hps: Math.round(d.hps) }))
  }, [activeLayers])

  // Densité d'aménagements cyclables par commune (en km).
  const cyclingKmByCommune = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'amenagements-cyclables')
    if (!layer || !zoneNames.length) return []
    const acc = {}
    layer.features.forEach((f) => {
      const km = featureLengthKm(f)
      if (km === 0) return
      // Si la feature a déjà une commune en propriété, on l'utilise ; sinon resolver.
      const commune = f.properties?.commune || zoneResolver(f)
      if (!commune) return
      acc[commune] = (acc[commune] || 0) + km
    })
    return Object.entries(acc)
      .map(([commune, km]) => ({ commune, km: +km.toFixed(2) }))
      .sort((a, b) => b.km - a.km)
      .slice(0, 15)
  }, [activeLayers, zoneResolver, zoneNames.length])

  // Top parkings individuels par capacité.
  const topParkings = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'parkings-hors-voirie')
    if (!layer || !layer.features.length) return []
    return layer.features
      .map((f) => ({
        nom: f.properties?.nom || f.properties?.ident || '—',
        capacity: Number(f.properties?.np_total) || 0,
      }))
      .filter((d) => d.capacity > 0)
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 15)
  }, [activeLayers])

  // Accidents par catégorie de véhicule, regroupés en familles lisibles.
  const accidentsByVehicle = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'accidents-corporels')
    if (!layer || !layer.features.length) return []
    const FAMILIES = [
      { name: 'Voiture', color: '#1E3A5F', match: /^(VL seul|VU seul|Voiturette|Autre v)/i },
      { name: '2-roues motorisés', color: '#C0772A', match: /(motocyclette|scooter|cyclomoteur|3RM|EDP)/i },
      { name: 'Vélo', color: '#2C8C5C', match: /(bicyclette|VAE)/i },
      { name: 'Poids lourds', color: '#5C6B7A', match: /(tracteur|^PL )/i },
      { name: 'Bus / Tram', color: '#7C5DC3', match: /(autobus|tramway)/i },
    ]
    const counts = Object.fromEntries(FAMILIES.map((f) => [f.name, 0]))
    counts['Autre'] = 0
    layer.features.forEach((f) => {
      const catv = f.properties?.catv
      if (!catv) return
      const family = FAMILIES.find((fam) => fam.match.test(catv))
      counts[family ? family.name : 'Autre'] += 1
    })
    const palette = { ...Object.fromEntries(FAMILIES.map((f) => [f.name, f.color])), 'Autre': '#9AA5B1' }
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([categorie, count]) => ({ categorie, count, color: palette[categorie] }))
      .sort((a, b) => b.count - a.count)
  }, [activeLayers])

  // Accidents corporels par année et par gravité.
  const accidentsByYear = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'accidents-corporels')
    if (!layer || !layer.features.length) return []
    const GRAV = { 'Indemne': 'indemne', 'Blessé léger': 'leger', 'Blessé hospitalisé': 'hospi', 'Tué': 'tue' }
    const agg = {}
    layer.features.forEach((f) => {
      const an = +f.properties?.an
      const key = GRAV[f.properties?.grav]
      if (!an || !key) return
      if (!agg[an]) agg[an] = { an, indemne: 0, leger: 0, hospi: 0, tue: 0 }
      agg[an][key] += 1
    })
    return Object.values(agg).sort((a, b) => a.an - b.an)
  }, [activeLayers])

  // Capacité de stationnement par commune (top 15) — somme de np_total / np_pmr / np_2rmot / np_veltot.
  const parkingCapacityByCommune = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'parkings-hors-voirie')
    if (!layer || !layer.features.length || !zoneNames.length) return []
    const acc = {}
    layer.features.forEach((f) => {
      const commune = zoneResolver(f)
      if (!commune) return
      const p = f.properties || {}
      const total = Number(p.np_total) || 0
      const pmr = Number(p.np_pmr) || 0
      const motot = Number(p.np_2rmot) || 0
      const velo = Number(p.np_veltot) || 0
      const standard = Math.max(0, total - pmr - motot - velo)
      if (!acc[commune]) acc[commune] = { commune, standard: 0, pmr: 0, motot: 0, velo: 0, total: 0 }
      acc[commune].standard += standard
      acc[commune].pmr += pmr
      acc[commune].motot += motot
      acc[commune].velo += velo
      acc[commune].total += total
    })
    return Object.values(acc)
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15)
  }, [activeLayers, zoneResolver, zoneNames.length])

  // Bornes IRVE par commune (sommer bornes + stations).
  const irveByCommune = useMemo(() => {
    const layers = activeLayers.filter((l) => l.id === 'irve-bornes' || l.id === 'irve-stations')
    if (!layers.length || !zoneNames.length) return []
    const acc = {}
    layers.forEach((l) => l.features.forEach((f) => {
      const c = zoneResolver(f)
      if (c) acc[c] = (acc[c] || 0) + 1
    }))
    return Object.entries(acc)
      .map(([commune, count]) => ({ commune, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [activeLayers, zoneResolver, zoneNames.length])

  // Km de couloirs de bus par commune.
  const busKmByCommune = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'couloirs-bus')
    if (!layer || !zoneNames.length) return []
    const acc = {}
    layer.features.forEach((f) => {
      const km = featureLengthKm(f)
      if (km === 0) return
      const c = zoneResolver(f)
      if (!c) return
      acc[c] = (acc[c] || 0) + km
    })
    return Object.entries(acc)
      .map(([commune, km]) => ({ commune, km: +km.toFixed(2) }))
      .sort((a, b) => b.km - a.km)
      .slice(0, 15)
  }, [activeLayers, zoneResolver, zoneNames.length])

  // Évolution des aménagements cyclables par année d'installation.
  const cyclingByYear = useMemo(() => {
    const layer = activeLayers.find((l) => l.id === 'amenagements-cyclables')
    if (!layer) return []
    const acc = {}
    layer.features.forEach((f) => {
      const an = +f.properties?.annee
      if (!an || an < 1990 || an > 2030) return
      acc[an] = (acc[an] || 0) + 1
    })
    return Object.entries(acc)
      .map(([an, count]) => ({ an: +an, count }))
      .sort((a, b) => a.an - b.an)
  }, [activeLayers])

  // Offre vs demande stationnement par commune.
  // Offre = somme np_total des parkings hors voirie ; Demande proxy = nombre de carrefours à feux.
  const supplyDemand = useMemo(() => {
    const parkings = activeLayers.find((l) => l.id === 'parkings-hors-voirie')
    if (!parkings || !carrefoursFeatures.length || !zoneNames.length) return []
    const offre = {}
    parkings.features.forEach((f) => {
      const c = zoneResolver(f)
      if (!c) return
      offre[c] = (offre[c] || 0) + (Number(f.properties?.np_total) || 0)
    })
    const demande = {}
    carrefoursFeatures.forEach((f) => {
      const c = zoneResolver(f)
      if (!c) return
      demande[c] = (demande[c] || 0) + 1
    })
    const all = new Set([...Object.keys(offre), ...Object.keys(demande)])
    return Array.from(all)
      .map((c) => ({
        commune: c,
        offre: offre[c] || 0,
        demande: demande[c] || 0,
        ratio: demande[c] ? (offre[c] || 0) / demande[c] : 0,
      }))
      .filter((d) => d.offre > 0 && d.demande > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 15)
  }, [activeLayers, carrefoursFeatures, zoneResolver, zoneNames.length])

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

  // Date de mise à jour d'un jeu précis (par id) — pour afficher la fraîcheur
  // dans le diagramme qui dépend de ce jeu en particulier.
  const dateOf = useMemo(() => {
    const cache = {}
    entries.forEach((entry) => {
      const ds = datasetStates[entry.id]
      cache[entry.id] = ds?.dataset ? datasetDate(entry, ds.dataset) : null
    })
    return (id) => cache[id] ?? null
  }, [entries, datasetStates])

  const charts = useMemo(() => {
    const out = []
    // Diagrammes d'usage par mode — disponibles côté mobilité.
    if (domaine === 'mobilite') {
      out.push({
        key: 'velo-top-capteurs',
        title: state.filters.from != null && state.filters.to != null
          ? `🚲 Lieux les plus fréquentés en vélo — passages ${state.filters.from}-${state.filters.to}`
          : '🚲 Lieux les plus fréquentés en vélo — passages cumulés (fenêtre 2 ans)',
        status: bikeUsage.status,
        date: oldest, // jeu agrégé côté serveur (pc_velo_p), pas dans le registre actif
        type: 'velo-top-capteurs',
        data: bikeUsage.items,
      })
      out.push({
        key: 'trafic-top-voies',
        title: '🚗 Voies les plus fréquentées en voiture — TJM (jour ouvrable)',
        status: trafficTopRoads.length === 0 ? 'vide' : 'pret',
        date: dateOf('comptage-trafic'),
        type: 'trafic-top-voies',
        data: trafficTopRoads,
      })
      out.push({
        key: 'peak-hours',
        title: '🕗 Trafic aux heures de pointe — matin vs soir (top 12 voies)',
        status: peakHoursByRoad.length === 0 ? 'vide' : 'pret',
        date: dateOf('comptage-trafic'),
        type: 'peak-hours',
        data: peakHoursByRoad,
      })
      out.push({
        key: 'accidents-par-annee',
        title: '🚨 Accidents corporels par année et gravité',
        status: accidentsByYear.length === 0 ? 'vide' : 'pret',
        date: dateOf('accidents-corporels'),
        type: 'accidents-par-annee',
        data: accidentsByYear,
      })
      out.push({
        key: 'accidents-par-vehicule',
        title: '🚦 Accidents corporels par catégorie de véhicule',
        status: accidentsByVehicle.length === 0 ? 'vide' : 'pret',
        date: dateOf('accidents-corporels'),
        type: 'accidents-vehicle',
        data: accidentsByVehicle,
      })
      out.push({
        key: 'irve-par-commune',
        title: '⚡ Bornes IRVE par commune (gestion électromobilité)',
        status: irveByCommune.length === 0 ? 'vide' : 'pret',
        date: dateOf('irve-bornes') || dateOf('irve-stations'),
        type: 'horizontal-bar',
        data: irveByCommune,
        props: { labelKey: 'commune', valueKey: 'count', color: '#7C5DC3', valueLabel: 'Bornes' },
      })
      out.push({
        key: 'bus-km-par-commune',
        title: '🚌 Km de couloirs de bus par commune',
        status: busKmByCommune.length === 0 ? 'vide' : 'pret',
        date: dateOf('couloirs-bus'),
        type: 'horizontal-bar',
        data: busKmByCommune,
        props: {
          labelKey: 'commune', valueKey: 'km', color: '#1E3A5F', valueLabel: 'km',
          formatter: (v) => `${v.toFixed(1)} km`,
        },
      })
      out.push({
        key: 'amenagements-par-annee',
        title: '🚲 Évolution des aménagements cyclables par année',
        status: cyclingByYear.length === 0 ? 'vide' : 'pret',
        date: dateOf('amenagements-cyclables'),
        type: 'cycling-by-year',
        data: cyclingByYear,
      })
      out.push({
        key: 'amenagements-km-par-commune',
        title: '🚲 Km d\'aménagements cyclables par commune',
        status: cyclingKmByCommune.length === 0 ? 'vide' : 'pret',
        date: dateOf('amenagements-cyclables'),
        type: 'horizontal-bar',
        data: cyclingKmByCommune,
        props: {
          labelKey: 'commune', valueKey: 'km', color: '#2C8C5C', valueLabel: 'km',
          formatter: (v) => `${v.toFixed(1)} km`,
        },
      })
    }
    if (domaine === 'stationnement') {
      out.push({
        key: 'capacite-par-commune',
        title: '🅿️ Capacité de stationnement par commune (top 15)',
        status: parkingCapacityByCommune.length === 0 ? 'vide' : 'pret',
        date: dateOf('parkings-hors-voirie'),
        type: 'capacite-par-commune',
        data: parkingCapacityByCommune,
      })
      out.push({
        key: 'top-parkings',
        title: '🅿️ Top parkings par capacité',
        status: topParkings.length === 0 ? 'vide' : 'pret',
        date: dateOf('parkings-hors-voirie'),
        type: 'horizontal-bar',
        data: topParkings,
        props: {
          labelKey: 'nom', valueKey: 'capacity', color: '#B5651D', valueLabel: 'places',
        },
      })
      out.push({
        key: 'offre-demande',
        title: '⚖️ Offre vs demande de stationnement par commune',
        status: supplyDemand.length === 0 ? 'vide' : 'pret',
        date: dateOf('parkings-hors-voirie'),
        type: 'supply-demand',
        data: supplyDemand,
      })
    }
    out.push({
      key: 'features-par-commune',
      title: domaine === 'stationnement'
        ? 'Places de stationnement par commune (top 12)'
        : 'Features par commune (top 12)',
      status: featuresByZone.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'features-par-zone',
      data: featuresByZone,
    })
    out.push({
      key: 'mode-distribution',
      title: 'Couverture infrastructure par mode de transport',
      status: modeDistribution.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'mode-distribution',
      data: modeDistribution,
    })
    out.push({
      key: 'top-datasets',
      title: 'Jeux de données par volume (top 10)',
      status: topDatasets.length === 0 ? 'vide' : 'pret',
      date: oldest,
      type: 'features-par-jeu',
      data: topDatasets,
    })
    return out
  }, [domaine, trafficTopRoads, bikeUsage, accidentsByYear, accidentsByVehicle, peakHoursByRoad, irveByCommune, busKmByCommune, cyclingByYear, cyclingKmByCommune, parkingCapacityByCommune, topParkings, supplyDemand, featuresByZone, modeDistribution, topDatasets, oldest, dateOf, state.filters.from, state.filters.to])

  const empty = entries.length === 0

  return (
    <div className="dashboard">
      <TopBar domaine={domaine} oldestDate={oldest} />
      <Timeline minYear={TIMELINE_MIN} maxYear={TIMELINE_MAX} />
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
