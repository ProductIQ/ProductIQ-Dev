// src/hooks/useProfile.ts
// Fetches the user's profile via the FastAPI backend (which uses the
// service-role key and can access all profile fields safely).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getProfile, updateProfile } from '@/lib/api'
import type { Profile } from '@/types/user'
import { useMutation } from '@tanstack/react-query'

export function useProfile() {
  const { user } = useAuth()

  const { data: profile, isLoading, refetch } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      return getProfile() as Promise<Profile>
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  })

  return { profile: profile ?? null, isLoading, refetch }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { full_name?: string; company_name?: string; slack_webhook_url?: string }) =>
      updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
