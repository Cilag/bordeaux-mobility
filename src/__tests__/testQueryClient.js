import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// QueryClient pour tests : pas de retry, pas de gc, pas de stale → comportement déterministe.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  })
}

// Wrapper pour `renderHook` / `render` qui injecte un QueryClientProvider.
// Usage : renderHook(() => useDatasets(...), { wrapper: wrapWithQueryClient(client) })
// NB : on utilise React.createElement (et non JSX) pour rester dans un fichier `.js`
// — oxc/plugin-react ne transforme le JSX que dans les `.jsx`.
export function wrapWithQueryClient(client) {
  return function Wrapper({ children }) {
    return createElement(QueryClientProvider, { client }, children)
  }
}
