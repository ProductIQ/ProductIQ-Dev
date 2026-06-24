// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import {
  User, Bell, CreditCard, Check, Copy, Eye, EyeOff,
  Lock, AlertTriangle, MessageSquare, Link2, ChevronRight, Receipt,
} from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'
import { UsageMeter } from '@/components/shared/UsageMeter'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────
function getInitials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: '#0F0F0F', text: '#C8F04A' },
  { bg: '#1D4ED8', text: '#BFDBFE' },
  { bg: '#7C3AED', text: '#EDE9FE' },
  { bg: '#059669', text: '#D1FAE5' },
  { bg: '#B45309', text: '#FEF3C7' },
]

function getAvatarColor(name: string) {
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

// ── Toggle Switch ─────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-[#0A0A0A]' : 'bg-[rgba(0,0,0,0.12)]'}`}
      style={{ height: 22, width: 40 }}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 18 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  )
}

// ── Mock transactions ─────────────────────────────────────────────
const TRANSACTIONS = [
  { date: '1 Apr 2026',  amount: '₹4,999', plan: 'Pro Monthly',  status: 'paid'   },
  { date: '1 Mar 2026',  amount: '₹4,999', plan: 'Pro Monthly',  status: 'paid'   },
  { date: '1 Feb 2026',  amount: '₹999',   plan: 'Pay-per-Report', status: 'paid' },
  { date: '15 Jan 2026', amount: '₹999',   plan: 'Pay-per-Report', status: 'failed' },
]

const SETTINGS_TABS = [
  { id: 'profile',       label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing',       label: 'Billing' },
  { id: 'api',           label: 'API' },
]

// ── Sub-panels ────────────────────────────────────────────────────
function ProfileTab({ user, profile }: { user: any; profile: any }) {
  const name = user?.user_metadata?.full_name ?? profile?.full_name ?? 'User'
  const company = user?.user_metadata?.company_name ?? profile?.company_name ?? ''
  const email = user?.email ?? profile?.email ?? ''
  const avatarColor = getAvatarColor(name)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success('Profile saved!')
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-[22px] font-bold"
            style={{ background: avatarColor.bg, color: avatarColor.text }}
          >
            {getInitials(name)}
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#0A0A0A]">{name}</p>
            <p className="text-[13px] text-[#A3A3A3]">{email}</p>
            <button
              className="mt-2 text-[12px] font-medium text-[#A3A3A3] border border-dashed border-[rgba(0,0,0,0.15)] px-3 py-1 rounded-full hover:border-[rgba(0,0,0,0.3)] transition-colors"
              title="Coming soon"
            >
              Upload photo — coming soon
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h2 className="text-[14px] font-bold text-[#0A0A0A] mb-5 flex items-center gap-2">
          <User size={15} className="text-[#A3A3A3]" /> Profile Details
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { label: 'Full name', defaultValue: name, type: 'text' },
            { label: 'Company name', defaultValue: company, type: 'text' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">{f.label}</label>
              <input
                type={f.type}
                defaultValue={f.defaultValue}
                className="input text-[14px]"
              />
            </div>
          ))}

          {/* Email (disabled) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Email</label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                readOnly
                className="input text-[14px] bg-[#F8F9FB] flex-1"
              />
              <div className="w-9 h-9 rounded-xl border border-[rgba(0,0,0,0.1)] flex items-center justify-center flex-shrink-0">
                <Lock size={12} className="text-[#A3A3A3]" />
              </div>
            </div>
          </div>

          {/* Market preference */}
          <div>
            <label className="block text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Default market</label>
            <select className="input text-[14px] appearance-none cursor-pointer">
              <option>India</option>
              <option>India – Tier 1 cities</option>
              <option>India – Tier 2+ cities</option>
              <option>Global</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-black btn-sm min-w-[120px]"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-[20px] p-6 border border-[rgba(239,68,68,0.2)] bg-[#FFF8F8]">
        <h2 className="text-[14px] font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#EF4444]" /> Danger Zone
        </h2>
        <p className="text-[13px] text-[#A3A3A3] mb-4">Permanently delete your account and all data. This cannot be undone.</p>
        <button
          onClick={() => setShowDelete(true)}
          className="text-[13px] font-semibold text-[#EF4444] border border-[rgba(239,68,68,0.3)] px-4 py-2 rounded-xl hover:bg-[rgba(239,68,68,0.06)] transition-colors"
        >
          Delete my account
        </button>

        <AnimatePresence>
          {showDelete && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mt-4 p-4 bg-white rounded-xl border border-[rgba(239,68,68,0.2)]"
            >
              <p className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Type <code className="bg-[#F8F9FB] px-1.5 py-0.5 rounded text-[12px]">DELETE</code> to confirm</p>
              <input type="text" placeholder="DELETE" className="input text-[14px] mb-3" />
              <div className="flex gap-2">
                <button className="btn btn-sm text-[13px] bg-[#EF4444] text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-red-600 transition-colors">
                  Confirm delete
                </button>
                <button onClick={() => setShowDelete(false)} className="btn btn-outline btn-sm">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    emailReady: true,
    emailDigest: true,
    slackSentiment: false,
    whatsappReady: false,
  })
  const [slackUrl, setSlackUrl] = useState('')
  const [testing, setTesting] = useState(false)

  function set(key: keyof typeof prefs, v: boolean) {
    setPrefs(p => ({ ...p, [key]: v }))
  }

  async function testSlack() {
    setTesting(true)
    await new Promise(r => setTimeout(r, 1000))
    setTesting(false)
    toast.success('Test message sent to Slack!')
  }

  const rows = [
    {
      label: 'Report ready',
      desc: 'Email when your intelligence report is generated',
      key: 'emailReady' as const,
      badge: null,
    },
    {
      label: 'Weekly digest',
      desc: 'Sunday summary of your brand performance',
      key: 'emailDigest' as const,
      badge: null,
    },
    {
      label: 'Slack sentiment alerts',
      desc: 'Receive a Slack message when sentiment drops',
      key: 'slackSentiment' as const,
      badge: null,
    },
    {
      label: 'WhatsApp — Report ready',
      desc: 'Instant WhatsApp when a report lands in your inbox',
      key: 'whatsappReady' as const,
      badge: 'Coming soon',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={`flex items-center justify-between px-6 py-4 gap-4 ${i < rows.length - 1 ? 'border-b border-[rgba(0,0,0,0.05)]' : ''}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">{row.label}</p>
                {row.badge && (
                  <span className="text-[10px] font-bold bg-[rgba(0,0,0,0.07)] text-[#A3A3A3] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {row.badge}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[#A3A3A3] mt-0.5">{row.desc}</p>
            </div>
            <Toggle
              checked={prefs[row.key]}
              onChange={(v) => !row.badge && set(row.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Slack webhook URL */}
      <AnimatePresence>
        {prefs.slackSentiment && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]"
          >
            <h3 className="text-[13px] font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
              <MessageSquare size={13} className="text-[#A3A3A3]" /> Slack Webhook URL
            </h3>
            <a href="#" className="text-[11px] text-[#0A0A0A] underline underline-offset-2 mb-3 inline-block">
              How to set up a Slack webhook ↗
            </a>
            <div className="flex gap-2 mt-2">
              <input
                type="url"
                value={slackUrl}
                onChange={e => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="input text-[13px] font-mono flex-1"
              />
              <button
                onClick={testSlack}
                disabled={testing || !slackUrl}
                className="btn btn-outline btn-sm flex-shrink-0 min-w-[64px]"
              >
                {testing ? 'Sending…' : 'Test'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function BillingTab({ profile }: { profile: any }) {
  const [copied, setCopied] = useState(false)
  const referralCode = profile?.referral_code ?? 'PRODUCT2024'
  const referralUrl  = `https://productiq.in/signup?ref=${referralCode}`

  async function copyReferral() {
    await navigator.clipboard.writeText(referralUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Referral link copied!')
  }

  const plan = (profile?.plan ?? 'free') as 'free' | 'pro' | 'enterprise'
  const configs = {
    free: { label: 'Free',       bg: '#0F0F0F', text: '#C8F04A', price: '₹0',     desc: '3 reports / month' },
    pro:  { label: 'Pro',        bg: '#C8F04A', text: '#0A0A0A', price: '₹4,999', desc: 'Unlimited reports' },
    enterprise: { label: 'Enterprise', bg: '#1D4ED8', text: '#fff', price: 'Custom', desc: 'Full API + custom agents' },
  }
  const planConfig = configs[plan] ?? configs.free

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-[14px] font-bold text-[#0A0A0A] flex items-center gap-2">
            <CreditCard size={15} className="text-[#A3A3A3]" /> Current Plan
          </h2>
          <span
            className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: planConfig.bg, color: planConfig.text }}
          >
            {planConfig.label}
          </span>
        </div>

        <div className="rounded-2xl p-5 mb-5 flex items-center justify-between gap-4" style={{ background: '#0F0F0F' }}>
          <div>
            <div className="text-[12px] text-white/50 mb-1">Reports this month</div>
            <div className="text-[26px] font-bold text-white">
              {profile?.reports_used_this_month ?? 1}
              <span className="text-[16px] font-normal text-white/30"> / {profile?.reports_limit ?? 3}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-white/50 mb-1">Renews</div>
            <div className="text-[18px] font-semibold text-white">May 1, 2026</div>
          </div>
        </div>

        <UsageMeter
          used={profile?.reports_used_this_month ?? 1}
          limit={profile?.reports_limit ?? 3}
          extraFromReferrals={profile?.extra_reports_from_referrals ?? 0}
          plan={plan}
        />

        <div className="flex justify-end gap-3 mt-5">
          <button className="btn btn-outline btn-sm">View invoices</button>
          <button className="btn btn-black btn-sm">Upgrade Plan →</button>
        </div>
      </div>

      {/* Referral */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <h2 className="text-[14px] font-bold text-[#0A0A0A] mb-1 flex items-center gap-2">
          <Link2 size={15} className="text-[#A3A3A3]" /> Referral Program
        </h2>
        <p className="text-[13px] text-[#A3A3A3] mb-4">Each referral unlocks 2 extra reports per month for you.</p>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={referralUrl}
            readOnly
            className="input text-[12px] font-mono flex-1 text-[#6B6B6B]"
          />
          <button
            onClick={copyReferral}
            className="w-10 h-10 rounded-xl border border-[rgba(0,0,0,0.1)] flex items-center justify-center flex-shrink-0 hover:bg-[#F8F9FB] transition-colors"
          >
            {copied ? <Check size={14} className="text-[#22C55E]" /> : <Copy size={14} className="text-[#A3A3A3]" />}
          </button>
        </div>
        <p className="text-[12px] text-[#A3A3A3]">
          <span className="text-[#0A0A0A] font-semibold">0 referrals</span> · 0 bonus reports unlocked
        </p>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-[20px] overflow-hidden border border-[rgba(0,0,0,0.07)]">
        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.05)]">
          <h2 className="text-[14px] font-bold text-[#0A0A0A]">Transaction History</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F8F9FB] text-[11px] uppercase tracking-wider text-[#A3A3A3] border-b border-[rgba(0,0,0,0.05)]">
              <th className="px-6 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 font-semibold">Amount</th>
              <th className="px-6 py-3 font-semibold">Plan</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">PDF</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((tx, i) => (
              <tr key={i} className="border-b last:border-0 border-[rgba(0,0,0,0.04)] hover:bg-[#F8F9FB] transition-colors">
                <td className="px-6 py-3 text-[13px] text-[#6B6B6B]">{tx.date}</td>
                <td className="px-6 py-3 text-[13px] font-mono font-semibold text-[#0A0A0A]">{tx.amount}</td>
                <td className="px-6 py-3 text-[13px] text-[#6B6B6B]">{tx.plan}</td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    tx.status === 'paid'   ? 'bg-[#dcfce7] text-[#16A34A]' :
                    tx.status === 'failed' ? 'bg-[#fee2e2] text-[#EF4444]' :
                    'bg-[rgba(0,0,0,0.07)] text-[#A3A3A3]'
                  }`}>{tx.status}</span>
                </td>
                <td className="px-6 py-3">
                  <button className="w-7 h-7 rounded-lg border border-[rgba(0,0,0,0.1)] flex items-center justify-center hover:bg-[#F0F2F5] transition-colors" title="Download PDF">
                    <Receipt size={12} className="text-[#A3A3A3]" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ApiTab() {
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notified, setNotified] = useState(false)

  function handleNotify() {
    if (notifyEmail) {
      setNotified(true)
      toast.success('You\'re on the list! We\'ll notify you when API launches.')
    }
  }

  const ENDPOINTS = [
    { method: 'GET',  path: '/reports',              desc: 'List all intelligence runs for your account' },
    { method: 'GET',  path: '/insights/:runId',       desc: 'Fetch structured insights from a completed report' },
    { method: 'GET',  path: '/sentiment/stream',      desc: 'Real-time brand health score via SSE' },
    { method: 'POST', path: '/reports/run',           desc: 'Trigger a new intelligence pipeline run' },
  ]

  return (
    <div className="space-y-4">
      {/* Hero dark panel */}
      <div
        className="rounded-[20px] p-8"
        style={{ background: '#0F0F0F', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span
          className="inline-block text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full mb-6"
          style={{ background: 'rgba(200,240,74,0.12)', color: '#C8F04A' }}
        >
          Coming Soon
        </span>
        <h2 className="text-[22px] font-bold text-white leading-[1.2] mb-3">
          Embed product intelligence<br />
          <span style={{ color: '#C8F04A' }}>anywhere.</span>
        </h2>
        <p className="text-[13px] text-white/40 leading-relaxed max-w-sm mb-8">
          Pipe AI-generated insights into your dashboards, Notion, Slack, or CRM — with a simple REST API.
        </p>

        {/* Endpoint list */}
        <div
          className="rounded-[14px] overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25">
              Planned Endpoints
            </span>
          </div>
          {ENDPOINTS.map((ep, i) => (
            <div
              key={ep.path}
              className="flex items-start gap-4 px-4 py-3"
              style={{ borderBottom: i < ENDPOINTS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
            >
              <span
                className="font-mono text-[10px] font-bold flex-shrink-0 mt-0.5 w-9"
                style={{ color: ep.method === 'POST' ? '#F59E0B' : '#C8F04A' }}
              >
                {ep.method}
              </span>
              <div className="min-w-0">
                <code className="text-[12px] font-mono text-white/70 block mb-0.5">{ep.path}</code>
                <p className="text-[11px] text-white/30 leading-snug">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notify row */}
      <div className="bg-white rounded-[20px] p-6 border border-[rgba(0,0,0,0.07)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0A0A0A] mb-1">Get early access</p>
        <p className="text-[13px] text-[#A3A3A3] mb-4">Be the first to access the API when it launches.</p>
        {!notified ? (
          <div className="flex gap-2">
            <input
              type="email"
              value={notifyEmail}
              onChange={e => setNotifyEmail(e.target.value)}
              placeholder="your@email.com"
              className="input text-[14px] flex-1"
            />
            <button onClick={handleNotify} className="btn btn-black btn-sm flex-shrink-0 px-5">
              Notify me
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#22C55E]">
            <Check size={16} /> You're on the waitlist
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, profile } = useAuth()

  return (
    <div className="max-w-[820px] mx-auto pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">Account Settings</h1>
        <p className="text-[14px] text-[#A3A3A3] mt-1">Manage your profile, notifications, billing, and API access.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <Tabs tabs={SETTINGS_TABS}>
          {(activeTab) => (
            <>
              {activeTab === 'profile'       && <ProfileTab user={user} profile={profile} />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'billing'       && <BillingTab profile={profile} />}
              {activeTab === 'api'           && <ApiTab />}
            </>
          )}
        </Tabs>
      </motion.div>
    </div>
  )
}
