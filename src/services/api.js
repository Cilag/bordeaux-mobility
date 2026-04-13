export const BORDEAUX_CENTER = [44.8378, -0.5792]
export const BORDEAUX_BBOX = { lamin: 44.7, lomin: -0.8, lamax: 44.95, lomax: -0.4 }

const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY
const SNCF_KEY = import.meta.env.VITE_SNCF_API_KEY
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY
const DATAHUB_BASE = 'https://datahub.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets'

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  try {
    return await res.json()
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}`)
  }
}

export async function fetchVCub() {
  const url = `${DATAHUB_BASE}/sv_vcub_p/records?limit=200&apikey=${DATAHUB_KEY}`
  const data = await apiFetch(url)
  return data.results
}

export async function fetchTBMStops() {
  const url = `${DATAHUB_BASE}/sv_arret_p/records?limit=2000&apikey=${DATAHUB_KEY}`
  const data = await apiFetch(url)
  return data.results
}

export async function fetchTBMVehicles() {
  // Positions véhicules TBM temps réel
  const url = `${DATAHUB_BASE}/sv_vehicule_p/records?limit=500&apikey=${DATAHUB_KEY}`
  const data = await apiFetch(url)
  return data.results
}

export async function fetchTrafficLights() {
  const url = `${DATAHUB_BASE}/ci_feux_p/records?limit=2000&apikey=${DATAHUB_KEY}`
  const data = await apiFetch(url)
  return data.results
}

export async function fetchSNCF() {
  const url = 'https://api.sncf.com/v1/coverage/sncf/stop_areas/stop_area:SNCF:87581009/departures?count=20'
  const data = await apiFetch(url, {
    headers: { Authorization: `Basic ${btoa(SNCF_KEY + ':')}` },
  })
  return data.departures ?? []
}

export async function fetchOpenSky() {
  const { lamin, lomin, lamax, lomax } = BORDEAUX_BBOX
  const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
  const data = await apiFetch(url)
  return data.states ?? []
}

export function getTomTomTrafficTileUrl() {
  return `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`
}
