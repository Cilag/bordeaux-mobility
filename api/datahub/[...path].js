// Function Vercel (Node runtime).
// Forward des requêtes /api/datahub/* vers data.bordeaux-metropole.fr
// en ajoutant la clé DATAHUB_API_KEY (env Vercel) côté serveur.
// Cache CDN 5 min : les données changent quotidiennement.
//
// Le runtime Node est nécessaire (pas Edge) car certaines réponses
// dépassent 4 MB (lignes-tbm-tracees ≈ 25 MB).

export default async function handler(req, res) {
  const key = process.env.DATAHUB_API_KEY
  if (!key) {
    return res.status(500).json({ error: 'DATAHUB_API_KEY not configured' })
  }

  // req.url ressemble à "/api/datahub/geojson/features/SV_ARRET_P"
  // on enlève le préfixe pour reconstruire l'URL upstream.
  const subPath = req.url.replace(/^\/api\/datahub/, '')
  const separator = subPath.includes('?') ? '&' : '?'
  const upstream = `https://data.bordeaux-metropole.fr${subPath}${separator}key=${key}`

  try {
    const response = await fetch(upstream)
    const body = await response.text()
    res.status(response.status)
    res.setHeader('Content-Type', response.headers.get('content-type') ?? 'application/json')
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.send(body)
  } catch (err) {
    // Scrub la clé du message d'erreur au cas où fetch l'a incluse (DNS, abort, etc.).
    const detail = err.message?.replace(key, '[redacted]') ?? 'unknown error'
    res.status(502).json({ error: 'upstream fetch failed', detail })
  }
}
