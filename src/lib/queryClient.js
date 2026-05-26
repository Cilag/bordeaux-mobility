import { QueryClient } from '@tanstack/react-query'

// Config partagée par toute l'app — singleton.
// - retry: 2 essais sur erreur transitoire (5xx ou réseau), pas sur 4xx
//   (le test du préfixe "HTTP 4" reproduit la logique de l'ex-fetchWithRetry).
// - retryDelay: backoff linéaire 500 ms × n° de tentative.
// - staleTime: 30 min — pas de refetch tant que les données sont fraîches.
// - gcTime: 1 h — garde la donnée en cache mémoire 1 h après le dernier subscriber.
// - refetchOnWindowFocus: refetch silencieux quand on revient sur l'onglet.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && !error?.message?.startsWith('HTTP 4'),
      retryDelay: (attempt) => 500 * attempt,
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})
