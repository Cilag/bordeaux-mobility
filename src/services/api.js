export const BORDEAUX_CENTER = [44.8378, -0.5792]
export const BORDEAUX_BBOX = { lamin: 44.7, lomin: -0.8, lamax: 44.95, lomax: -0.4 }

const DATAHUB_KEY = import.meta.env.VITE_DATAHUB_API_KEY
const SNCF_KEY = import.meta.env.VITE_SNCF_API_KEY
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY
const GEOJSON_BASE = '/api/datahub/geojson/features'

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  try {
    return await res.json()
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}`)
  }
}

// Convertit un GeoJSON FeatureCollection en tableau d'objets plats
// avec geo_point_2d: { lat, lon } pour compatibilité avec les composants existants
function flattenGeoJSON(geojson) {
  return (geojson.features ?? [])
    .filter((f) => f.geometry?.coordinates)
    .map((f) => ({
      ...f.properties,
      geo_point_2d: {
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      },
    }))
}

export async function fetchVCub() {
  const data = await apiFetch(`${GEOJSON_BASE}/CI_VCUB_P?key=${DATAHUB_KEY}`)
  return flattenGeoJSON(data)
}

export async function fetchTBMStops() {
  const data = await apiFetch(`${GEOJSON_BASE}/SV_ARRET_P?key=${DATAHUB_KEY}`)
  return flattenGeoJSON(data)
}

export async function fetchTBMVehicles() {
  const data = await apiFetch(`${GEOJSON_BASE}/SV_VEHIC_P?key=${DATAHUB_KEY}`)
  return flattenGeoJSON(data)
}

export async function fetchTrafficLights() {
  const data = await apiFetch(`${GEOJSON_BASE}/PC_CARF_P?key=${DATAHUB_KEY}`)
  return flattenGeoJSON(data)
}

export async function fetchSNCF() {
  const url = '/api/sncf/v1/coverage/sncf/stop_areas/stop_area:SNCF:87581009/departures?count=20'
  const data = await apiFetch(url, {
    headers: { Authorization: `Basic ${btoa(SNCF_KEY + ':')}` },
  })
  return data.departures ?? []
}

export async function fetchOpenSky() {
  const { lamin, lomin, lamax, lomax } = BORDEAUX_BBOX
  const url = `/api/opensky/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`
  const data = await apiFetch(url)
  return data.states ?? []
}

export function getTomTomTrafficTileUrl() {
  return `https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`
}
