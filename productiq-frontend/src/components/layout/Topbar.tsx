// src/components/layout/Topbar.tsx
import { Bell, Slash, Search, Command } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'

export function Topbar() {
  const { user, profile } = useAuth()
  const navigate          = useNavigate()
  const location          = useLocation()

  const paths = location.pathname.split('/').filter(Boolean)
  const formatRoute = (p: string) => p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ')

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between px-6"
      style={{
        background: 'rgba(240,242,245,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* Left — breadcrumb slot */}
      <div className="flex items-center text-[12px] font-medium text-[#6B6B6B]">
        <button onClick={() => navigate('/dashboard')} className="hover:text-[#0A0A0A] transition-colors">
          Workspace
        </button>
        {paths.map((path, idx) => (
          <div key={path} className="flex items-center">
            <Slash size={10} className="mx-1.5 text-[rgba(0,0,0,0.15)] -rotate-12" />
            <span className={`${idx === paths.length - 1 ? 'text-[#0A0A0A] font-semibold' : ''}`}>
               {formatRoute(path.substring(0, 15))}{path.length > 15 ? '...' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center relative">
           <Search size={13} className="absolute left-3 text-[#A3A3A3]" />
           <input 
             placeholder="Search insights..." 
             className="w-48 pl-8 pr-8 py-1.5 bg-[#F8F9FB] border border-[rgba(0,0,0,0.06)] rounded-full text-[12px] focus:outline-none focus:border-[#0A0A0A] focus:w-64 transition-all"
           />
           <div className="absolute right-2.5 flex items-center gap-0.5 text-[#A3A3A3] bg-white border border-[rgba(0,0,0,0.06)] px-1 rounded shadow-sm">
             <Command size={9} />
             <span className="text-[9px] font-mono leading-none pt-0.5">K</span>
           </div>
        </div>

        <div className="w-[1px] h-4 bg-[rgba(0,0,0,0.1)] hidden sm:block mx-1" />
        {/* Usage chip */}
        {profile && (
          <button
            onClick={() => navigate('/settings')}
            className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-full text-[12px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: `conic-gradient(#C8F04A ${(profile.reports_used_this_month / profile.reports_limit) * 360}deg, #E5E7EB 0deg)`,
              }}
            />
            {profile.reports_used_this_month} / {profile.reports_limit} reports
          </button>
        )}

        {/* Bell */}
        <button
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-white/80 transition-all"
          style={{ border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <Bell size={14} strokeWidth={1.5} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C8F04A]" />
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
          style={{ background: '#0A0A0A', color: '#C8F04A' }}
        >
          {getInitials(user?.user_metadata?.full_name ?? '')}
        </button>
      </div>
    </header>
  )
}
