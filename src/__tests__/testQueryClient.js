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
export function wrapWithQueryClient(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}
