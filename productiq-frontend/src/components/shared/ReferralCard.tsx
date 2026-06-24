// src/components/shared/ReferralCard.tsx
import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralCardProps {
  referralCode?: string | null
  successfulReferrals?: number
  bonusReports?: number
  dark?: boolean
}

export function ReferralCard({
  referralCode,
  successfulReferrals = 0,
  bonusReports = 0,
  dark = true,
}: ReferralCardProps) {
  const [copied, setCopied] = useState(false)

  const referralUrl = `productiq.in/signup?ref=${referralCode ?? 'YOURCODE'}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(`https://${referralUrl}`)
      setCopied(true)
      toast.success('Referral link copied!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy — try manually.')
    }
  }

  if (dark) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] p-5"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-3 rounded-full" style={{ background: '#C8F04A' }} />
          <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">
            Unlock more reports
          </h3>
        </div>
        <p className="text-[12px] text-white/40 mb-4 leading-relaxed">
          Each referral unlocks 2 extra reports — no payment needed.
        </p>

        {/* Link row */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] mb-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <code className="flex-1 text-[10px] font-mono text-white/50 truncate">
            {referralUrl}
          </code>
          <button
            onClick={copy}
            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors"
            style={{ color: copied ? '#C8F04A' : 'rgba(255,255,255,0.30)' }}
            onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = '#C8F04A' }}
            onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.30)' }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>

        {/* Stats */}
        {(successfulReferrals > 0 || bonusReports > 0) && (
          <p className="text-[10px] text-white/25">
            {successfulReferrals} referral{successfulReferrals !== 1 ? 's' : ''} ·{' '}
            {bonusReports} bonus report{bonusReports !== 1 ? 's' : ''} unlocked
          </p>
        )}
      </motion.div>
    )
  }

  // Light variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] p-5 bg-white border border-[rgba(0,0,0,0.07)]"
    >
      <h3 className="text-[12px] font-bold text-[#0A0A0A] uppercase tracking-wider mb-1">
        Unlock more reports
      </h3>
      <p className="text-[12px] text-[#A3A3A3] mb-4 leading-relaxed">
        Each referral unlocks 2 extra reports — no payment needed.
      </p>

      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] mb-3 border"
        style={{ background: '#F8F9FB', borderColor: 'rgba(0,0,0,0.07)' }}
      >
        <code className="flex-1 text-[10px] font-mono text-[#A3A3A3] truncate">{referralUrl}</code>
        <button
          onClick={copy}
          className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
        >
          {copied ? <Check size={11} className="text-[#22C55E]" /> : <Copy size={11} />}
        </button>
      </div>

      {(successfulReferrals > 0 || bonusReports > 0) && (
        <p className="text-[11px] text-[#A3A3A3]">
          {successfulReferrals} referral{successfulReferrals !== 1 ? 's' : ''} ·{' '}
          {bonusReports} bonus report{bonusReports !== 1 ? 's' : ''} unlocked
        </p>
      )}
    </motion.div>
  )
}
