import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

// Champs internes/techniques masqués dans les popups.
const HIDDEN_FIELDS = new Set(['gid', 'objectid', 'fid', 'geo_point_2d', 'geo_shape', 'coordonnees', 'geom_o', 'geom_err'])

// Champs date à afficher en premier, dans cet ordre.
const DATE_FIELDS_PRIORITY = [
  'date_debut', 'date_fin', 'debut', 'fin', 'datedebut', 'datefin',
  'datetime', 'an', 'annee', 'an_serv', 'mdate', 'cdate',
]

function formatDateValue(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number' && v >= 1900 && v <= 2200) return String(v)
  const s = String(v)
  // ISO-like : on prend juste la partie date
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('fr-FR')
  }
  return s
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPopup(libelle, properties) {
  if (!properties) return `<strong>${escapeHtml(libelle)}</strong>`
  // Dates en bandeau (toujours visibles si présentes).
  const dateRows = []
  for (const k of DATE_FIELDS_PRIORITY) {
    const v = properties[k]
    if (v != null && v !== '') {
      dateRows.push(
        `<div><span style="color:#5C6B7A">${escapeHtml(k)}</span> : <strong>${escapeHtml(formatDateValue(v))}</strong></div>`,
      )
    }
  }
  const dateBanner = dateRows.length
    ? `<div style="background:#F1F4F7;border-left:3px solid #1E3A5F;padding:4px 8px;border-radius:3px;margin-bottom:6px;font-size:11px">${dateRows.join('')}</div>`
    : ''
  // Puis les autres propriétés (hors champs masqués / déjà affichées).
  const skip = new Set([...HIDDEN_FIELDS, ...DATE_FIELDS_PRIORITY])
  const others = Object.entries(properties)
    .filter(([k, v]) => v != null && v !== '' && !skip.has(k))
    .slice(0, 6)
    .map(([k, v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      const short = val.length > 80 ? val.slice(0, 77) + '…' : val
      return `<div><span style="color:#5C6B7A">${escapeHtml(k)}</span> : ${escapeHtml(short)}</div>`
    })
    .join('')
  return `<div style="font-family:system-ui;font-size:12px;max-width:280px">
    <div style="font-weight:600;color:#1F2933;margin-bottom:5px">${escapeHtml(libelle)}</div>
    ${dateBanner}
    ${others}
  </div>`
}

// Rend les features d'un jeu (point/ligne/polygone). La prop `key` du parent
// doit changer quand les données changent, car <GeoJSON> ne re-rend pas seul.
export default function GeoJsonLayer({ features, color = '#1e3a5f', libelle = '', weight = 2, radius = 5 }) {
  if (!features || features.length === 0) return null
  const filtered = features.filter((f) => f.geometry) // exclut features sans géométrie
  if (filtered.length === 0) return null
  const data = { type: 'FeatureCollection', features: filtered }
  return (
    <GeoJSON
      data={data}
      style={{ color, weight, fillColor: color, fillOpacity: 0.15 }}
      pointToLayer={(feature, latlng) =>
        L.circleMarker(latlng, { radius, color, fillColor: color, fillOpacity: 0.7, weight: 1.5 })}
      onEachFeature={(feature, layer) => {
        layer.bindPopup(buildPopup(libelle, feature.properties))
      }}
    />
  )
}
