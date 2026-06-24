// src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  LayoutDashboard, FilePlus, TrendingUp, DollarSign,
  Settings, ChevronLeft, ChevronRight, LogOut, Network,
  Zap, Building2, MessageSquare, ArrowLeftRight, CheckSquare,
  Bell,
} from 'lucide-react'
import { useUIStore } from '@/stores/useUIStore'
import { useAuth } from '@/hooks/useAuth'
import { cn, getInitials } from '@/lib/utils'

const NAV_CORE = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/reports/new', icon: FilePlus,         label: 'New Report'       },
  { to: '/knowledge',   icon: Network,          label: 'Knowledge Graph'  },
  { to: '/sentiment',   icon: TrendingUp,        label: 'Brand Pulse',    badge: 'Pro' },
  { to: '/prices',      icon: DollarSign,        label: 'Price Tracker',  badge: 'Pro' },
]

const NAV_INTELLIGENCE = [
  { to: '/intelligence',   icon: Zap,           label: 'Intel Feed',     badge: 'Live', live: true },
  { to: '/brands',         icon: Building2,     label: 'Brand Profiles'  },
  { to: '/notifications',  icon: Bell,          label: 'Notifications'   },
]

const NAV_AI = [
  { to: '/chat',       icon: MessageSquare,  label: 'AI Chat',        badge: 'Pro' },
  { to: '/compare',    icon: ArrowLeftRight, label: 'Compare Runs'    },
  { to: '/validate',   icon: CheckSquare,    label: 'Concept Validator', badge: 'Pro' },
]

const NAV_BOTTOM = [
  { to: '/settings', icon: Settings, label: 'Settings' },
]

// Combined for rendering
type NavItem = { to: string; icon: React.ElementType; label: string; badge?: string; live?: boolean }

const NAV = [...NAV_CORE, ...NAV_INTELLIGENCE, ...NAV_AI, ...NAV_BOTTOM]

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const { user, profile, signOut }               = useAuth()
  const navigate                                  = useNavigate()
  const W = sidebarCollapsed ? 64 : 220

  return (
    <aside
      className="sidebar-dark fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden"
      style={{
        width: W,
        background: '#0F0F0F',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center h-16 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-[#C8F04A] flex items-center justify-center flex-shrink-0">
          <span className="text-[#0A0A0A] font-bold text-[10px] tracking-tight">IQ</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="ml-3 overflow-hidden whitespace-nowrap"
            >
              <span className="text-[14px] font-semibold text-white tracking-tight">ProductIQ</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2.5 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {/* Core */}
        {!sidebarCollapsed && (
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 px-3 mb-1 mt-1">Core</p>
        )}
        {NAV_CORE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5',
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0 transition-all" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(200,240,74,0.15)', color: '#C8F04A' }}>
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#C8F04A]" />}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.10)' }}>
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* Intelligence */}
        {!sidebarCollapsed && (
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 px-3 mb-1 mt-3">Intelligence</p>
        )}
        {sidebarCollapsed && <div className="h-2" />}
        {NAV_INTELLIGENCE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5',
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0 transition-all" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                      {item.live && (
                        <span className="ml-auto flex items-center gap-1 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                          <span className="w-1 h-1 rounded-full bg-[#22C55E] animate-pulse" />{item.badge}
                        </span>
                      )}
                      {item.badge && !item.live && (
                        <span className="ml-auto text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(200,240,74,0.15)', color: '#C8F04A' }}>
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#C8F04A]" />}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.10)' }}>
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* AI Tools */}
        {!sidebarCollapsed && (
          <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-white/20 px-3 mb-1 mt-3">AI Tools</p>
        )}
        {sidebarCollapsed && <div className="h-2" />}
        {NAV_AI.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5',
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0 transition-all" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[13px] font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(200,240,74,0.15)', color: '#C8F04A' }}>
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#C8F04A]" />}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.10)' }}>
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Bottom nav */}
        {NAV_BOTTOM.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl transition-all duration-150 group relative',
              sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5',
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/80 hover:bg-white/5',
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={17} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0 transition-all" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                      <span className="text-[13px] font-medium">{item.label}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-[#C8F04A]" />}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg text-[12px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.10)' }}>
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}

      </nav>

      {/* User */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Plan pill */}
        {!sidebarCollapsed && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#C8F04A]" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-white/40">
              {profile.plan} plan
            </span>
          </motion.div>
        )}

        {/* Avatar row */}
        <div className={cn('flex items-center gap-2.5', sidebarCollapsed && 'justify-center')}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: '#C8F04A', color: '#0A0A0A' }}
          >
            {getInitials(user?.user_metadata?.full_name ?? '')}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-[12px] font-medium text-white truncate">
                  {user?.user_metadata?.full_name ?? 'User'}
                </div>
                <div className="text-[10px] text-white/30 truncate">{user?.email}</div>
              </motion.div>
            )}
          </AnimatePresence>
          {!sidebarCollapsed && (
            <button
              onClick={async () => { await signOut(); navigate('/') }}
              className="text-white/25 hover:text-red-400 transition-colors ml-auto"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150 z-50"
        style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
