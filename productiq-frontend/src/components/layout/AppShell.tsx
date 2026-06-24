// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '@/stores/useUIStore'

export function AppShell() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const ML = sidebarCollapsed ? 64 : 220

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden">
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0"
        style={{ marginLeft: ML, transition: 'margin-left 0.25s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
