// src/types/user.ts

export type Plan = 'free' | 'pro' | 'enterprise'
export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  plan: Plan
  role?: UserRole
  reports_used_this_month: number
  reports_limit: number
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  referral_code: string
  referred_by: string | null
  extra_reports_from_referrals: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  amount_paise: number
  currency: string
  type: 'subscription' | 'pay_per_report' | 'enterprise'
  status: 'created' | 'paid' | 'failed' | 'refunded'
  plan: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string | null
  user_metadata: {
    full_name?: string
    company_name?: string
  }
}
