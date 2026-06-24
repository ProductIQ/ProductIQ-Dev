// src/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/user'

export function useProfile() {
  const { user } = useAuth()

  const { data: profile, isLoading, refetch } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  return { profile: profile ?? null, isLoading, refetch }
}
