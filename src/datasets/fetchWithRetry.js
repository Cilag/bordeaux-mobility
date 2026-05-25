// Wrapper de `fetch` avec retry sur erreur transitoire (5xx + exceptions réseau).
// Ne retry PAS sur 4xx (problème permanent : mauvais id, droits, etc.).
// Renvoie { response, attemptsUsed } pour que l'appelant sache si la retry a sauvé.
export async function fetchWithRetry(url, options = {}) {
  const {
    attempts = 2,
    backoffMs = 500,
    fetchImpl = fetch,
  } = options

  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchImpl(url)
      if (response.ok) return { response, attemptsUsed: attempt }
      if (response.status >= 400 && response.status < 500) {
        // erreur permanente : pas de retry
        throw new Error(`HTTP ${response.status}`)
      }
      // 5xx : on tente une retry si possible
      lastError = new Error(`HTTP ${response.status}`)
    } catch (err) {
      if (err.message?.startsWith('HTTP 4')) throw err
      lastError = err
    }
    if (attempt < attempts) {
      await new Promise((r) => setTimeout(r, backoffMs * attempt))
    }
  }
  throw lastError
}
