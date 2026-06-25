// src/hooks/useAuth.ts
// Real Supabase Auth — manages session, user, and profile via Supabase.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AuthUser, Profile } from '@/types/user'
import { setSentryUser, clearSentryUser, addSentryBreadcrumb } from '@/lib/sentry'

// ── Context ────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Helpers ────────────────────────────────────────────────────

/** Convert a Supabase User to our AuthUser type */
function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: (user.user_metadata?.full_name as string) ?? undefined,
      company_name: (user.user_metadata?.company_name as string) ?? undefined,
    },
  }
}

/** Fetch the user's profile from the profiles table */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.warn('[auth] Could not fetch profile:', error.message)
    return null
  }
  return (data as Profile) ?? null
}

// ── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── E2E test mode: bypass Supabase auth with mock user ─────────
  // When VITE_E2E_TEST is set, we skip Supabase entirely and use a
  // mock session. This allows Playwright tests to run without a real
  // Supabase instance. The API layer (axios) still calls the backend,
  // which is mocked via page.route() in the test fixtures.
  const isE2ETest = import.meta.env.VITE_E2E_TEST === 'true'

  // ── Initialise: restore session from Supabase ─────────────────
  useEffect(() => {
    let mounted = true

    // ── E2E test mode: inject mock session immediately ───────────
    if (isE2ETest) {
      const mockUser: AuthUser = {
        id: 'test-user-001',
        email: 'test@productiq.dev',
        user_metadata: { full_name: 'Test User', company_name: 'TestCo' },
      }
      const mockProfile: Profile = {
        id: 'test-user-001',
        email: 'test@productiq.dev',
        full_name: 'Test User',
        company_name: 'TestCo',
        plan: 'pro',
        role: 'admin',
        reports_used_this_month: 5,
        reports_limit: 50,
        razorpay_customer_id: null,
        razorpay_subscription_id: null,
        referral_code: 'TESTREF',
        referred_by: null,
        extra_reports_from_referrals: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUser(mockUser)
      setProfile(mockProfile)
      setIsLoading(false)
      return
    }

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const s = data.session
      setSession(s)
      setUser(toAuthUser(s?.user ?? null))

      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        if (mounted) setProfile(p)
      }
      setIsLoading(false)
    }

    init()

    // ── Listen for auth state changes ───────────────────────────
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(toAuthUser(newSession?.user ?? null))

        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id)
          setProfile(p)
          // Set Sentry user context for error tracking
          setSentryUser({
            id: newSession.user.id,
            email: newSession.user.email ?? undefined,
            username: newSession.user.user_metadata?.full_name,
          })
          addSentryBreadcrumb('auth', 'User signed in', 'info', { user_id: newSession.user.id })
        } else {
          setProfile(null)
          clearSentryUser()
        }
      }
    )

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // ── signIn ────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setIsLoading(false)
      throw error
    }
    // onAuthStateChange will set user + profile
    setIsLoading(false)
  }, [])

  // ── signUp ────────────────────────────────────────────────────
  const signUp = useCallback(
    async (email: string, password: string, metadata: Record<string, string>) => {
      setIsLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      })
      if (error) {
        setIsLoading(false)
        throw error
      }
      // If email confirmation is disabled, onAuthStateChange fires immediately.
      // If enabled, user must confirm email first.
      setIsLoading(false)
    },
    []
  )

  // ── signOut ───────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setIsLoading(true)
    addSentryBreadcrumb('auth', 'User signing out', 'info')
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    clearSentryUser()
    setIsLoading(false)
  }, [])

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }

  return React.createElement(AuthContext.Provider, { value }, children)
}

// ── Hook ───────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
