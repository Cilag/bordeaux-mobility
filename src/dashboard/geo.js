// Test point-dans-anneau par lancer de rayon. point et ring en [lon, lat].
export function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// Point représentatif d'une feature (coordonnée pour Point, premier sommet sinon).
export function featurePoint(feature) {
  const g = feature?.geometry
  if (!g) return null
  if (g.type === 'Point') return g.coordinates
  if (g.type === 'MultiPoint') return g.coordinates[0]
  if (g.type === 'LineString') return g.coordinates[0]
  if (g.type === 'MultiLineString') return g.coordinates[0]?.[0]
  if (g.type === 'Polygon') return g.coordinates[0]?.[0]
  if (g.type === 'MultiPolygon') return g.coordinates[0]?.[0]?.[0]
  return null
}

// Anneaux extérieurs d'une zone (Polygon ou MultiPolygon).
function outerRings(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((p) => p[0])
  return []
}

function ringBbox(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

// Construit un résolveur (feature) => nom de zone | null, optimisé par bbox.
export function makeZoneResolver(zoneFeatures, nameField) {
  const indexed = zoneFeatures
    .map((z) => {
      const rings = outerRings(z.geometry)
      if (!rings.length) return null
      const name = z?.properties?.[nameField]
      if (!name) return null
      const bbox = ringBbox(rings.flat())
      return { name, rings, bbox }
    })
    .filter(Boolean)
  return function resolveZone(feature) {
    const pt = featurePoint(feature)
    if (!pt) return null
    const [x, y] = pt
    for (const z of indexed) {
      if (x < z.bbox.minX || x > z.bbox.maxX || y < z.bbox.minY || y > z.bbox.maxY) continue
      if (z.rings.some((r) => pointInRing(pt, r))) return z.name
    }
    return null
  }
}

// Distance haversine entre deux points [lon, lat] en km.
export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function lineLengthKm(coords) {
  let total = 0
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i])
  return total
}

// Longueur d'une feature LineString ou MultiLineString en km. 0 sinon.
export function featureLengthKm(feature) {
  const g = feature?.geometry
  if (!g) return 0
  if (g.type === 'LineString') return lineLengthKm(g.coordinates)
  if (g.type === 'MultiLineString') return g.coordinates.reduce((s, c) => s + lineLengthKm(c), 0)
  return 0
}

// Détection du champ portant le nom de commune dans un jeu de contours.
const NAME_CANDIDATES = ['commune', 'COMMUNE', 'nom', 'NOM', 'libelle', 'LIBELLE', 'nomcommune', 'nom_commune', 'name']
export function detectNameField(features) {
  if (!features.length) return null
  const props = features[0].properties || {}
  return NAME_CANDIDATES.find((f) => typeof props[f] === 'string' && props[f].trim() !== '') || null
}
