// src/hooks/useAuth.ts
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { AuthUser, Profile } from '@/types/user'

// ── Mock Auth State ────────────────────────────────────────────
const MOCK_USER: AuthUser = {
  id: 'mock-user-001',
  email: 'founder@productiq.in',
  user_metadata: {
    full_name: 'Irfan Ahmed',
    company_name: 'ProductIQ Demo',
  },
}

const MOCK_PROFILE: Profile = {
  id: 'mock-user-001',
  email: 'founder@productiq.in',
  full_name: 'Irfan Ahmed',
  company_name: 'ProductIQ Demo',
  plan: 'free',
  reports_used_this_month: 1,
  reports_limit: 3,
  razorpay_customer_id: null,
  razorpay_subscription_id: null,
  referral_code: 'IRFAN2024',
  referred_by: null,
  extra_reports_from_referrals: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

// ── Context ────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate async auth check
    const timer = setTimeout(() => {
      // Start as logged-out so the landing page shows
      setUser(null)
      setProfile(null)
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  const signIn = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setUser(MOCK_USER)
    setProfile(MOCK_PROFILE)
    setIsLoading(false)
  }, [])

  const signUp = useCallback(async (_email: string, _password: string, metadata: Record<string, string>) => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    const newUser: AuthUser = {
      ...MOCK_USER,
      user_metadata: {
        full_name: metadata.full_name,
        company_name: metadata.company_name,
      },
    }
    setUser(newUser)
    setProfile({ ...MOCK_PROFILE, full_name: metadata.full_name, company_name: metadata.company_name })
    setIsLoading(false)
  }, [])

  const signOut = useCallback(async () => {
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 300))
    setUser(null)
    setProfile(null)
    setIsLoading(false)
  }, [])

  const value: AuthContextValue = {
    user,
    profile,
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
