// src/components/ui/PlanGate.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'

interface PlanGateProps {
  requiredPlan: 'pro' | 'enterprise'
  children: React.ReactNode
  fallback?: React.ReactNode
  featureName?: string
}

const PLAN_ORDER: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }

export function PlanGate({ requiredPlan, children, fallback, featureName }: PlanGateProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const userPlanLevel = PLAN_ORDER[profile?.plan ?? 'free'] ?? 0
  const requiredLevel = PLAN_ORDER[requiredPlan]

  if (userPlanLevel >= requiredLevel) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      {/* Blurred children behind overlay */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(5px)', opacity: 0.5 }}>
        {children}
      </div>

      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center rounded-[20px]"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(2px)' }}
      >
        <div
          className="bg-white rounded-[20px] p-7 text-center max-w-xs w-full mx-4"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.10)',
          }}
        >
          {/* Lock visual */}
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-4"
            style={{ background: '#F8F9FB', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
              <rect x="2" y="9" width="14" height="12" rx="3" stroke="#0A0A0A" strokeWidth="1.5"/>
              <path d="M5 9V6a4 4 0 0 1 8 0v3" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Badge */}
          <div className="mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
              style={{ background: '#0F0F0F', color: '#C8F04A' }}
            >
              {requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro'} feature
            </span>
          </div>

          <p className="text-[14px] font-bold text-[#0A0A0A] mt-2">
            {featureName ?? 'Pro feature'}
          </p>
          <p className="text-[12px] text-[#A3A3A3] mt-1.5 leading-relaxed">
            Upgrade to{' '}
            {requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro'} to unlock this
            feature.
          </p>

          <button
            onClick={() => navigate('/pricing')}
            className="mt-5 w-full h-10 rounded-xl text-[13px] font-semibold transition-all"
            style={{ background: '#0A0A0A', color: '#C8F04A' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#0A0A0A' }}
          >
            View plans
          </button>
        </div>
      </motion.div>
    </div>
  )
}
