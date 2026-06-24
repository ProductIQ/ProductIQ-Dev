// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      retry:               2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error(error.message || 'Something went wrong')
      },
    },
  },
})
