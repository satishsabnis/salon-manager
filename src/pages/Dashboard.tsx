import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Users, BarChart2, CalendarRange, Menu, X, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', to: '/dashboard/appointments', icon: CalendarDays },
  { label: 'Calendar', to: '/dashboard/calendar', icon: CalendarRange },
  { label: 'Clients', to: '/dashboard/clients', icon: Users },
  { label: 'Analytics', to: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Admin', to: '/dashboard/admin', icon: ShieldCheck },
  { label: 'AI Assistant', to: '/dashboard/ai', icon: Sparkles },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const SidebarContent = () => (
    <nav className="flex flex-col h-full py-6 px-4 space-y-1">
      <p className="text-xs uppercase tracking-widest font-semibold mb-4 px-2"
        style={{ color: 'rgba(212,168,71,0.6)' }}>
        Menu
      </p>
      {navItems.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={({ isActive }) =>
            isActive
              ? { backgroundColor: '#D4A847', color: '#1A0505', borderRadius: '8px' }
              : { color: '#D4A847', backgroundColor: 'transparent' }
          }
          onMouseEnter={(e) => {
            const el = e.currentTarget
            if (!el.getAttribute('aria-current')) {
              el.style.backgroundColor = 'rgba(212,168,71,0.15)'
            }
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            if (!el.getAttribute('aria-current')) {
              el.style.backgroundColor = 'transparent'
            }
          }}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar — desktop */}
      <aside
        style={{ backgroundColor: '#1A0505' }}
        className="hidden md:flex flex-col w-60 shrink-0"
      >
        <div
          style={{ backgroundColor: '#2C0A0A' }}
          className="flex flex-col items-center border-b border-white/10"
        >
          <img
            src="/logo.jpg"
            alt="New Look Beauty Salon"
            style={{ width: '140px', display: 'block', margin: '0 auto', padding: '12px 8px' }}
            onError={(e) => {
              const parent = (e.currentTarget as HTMLImageElement).parentElement!
              e.currentTarget.style.display = 'none'
              const fallback = document.createElement('span')
              fallback.textContent = 'NEW LOOK'
              fallback.style.cssText = 'color:#D4A847;font-size:20px;font-weight:900;letter-spacing:0.12em;padding:16px 8px;display:block;text-align:center'
              parent.appendChild(fallback)
            }}
          />
        </div>
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            style={{ backgroundColor: '#1A0505' }}
            className="relative z-50 w-64 flex flex-col"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-white/10"
              style={{ backgroundColor: '#2C0A0A' }}
            >
              <img
                src="/logo.jpg"
                alt="New Look Beauty Salon"
                style={{ width: '90px', display: 'block', padding: '4px 0' }}
                onError={(e) => {
                  const parent = (e.currentTarget as HTMLImageElement).parentElement!
                  e.currentTarget.style.display = 'none'
                  const fallback = document.createElement('span')
                  fallback.textContent = 'NEW LOOK'
                  fallback.style.cssText = 'color:#D4A847;font-size:15px;font-weight:900;letter-spacing:0.1em'
                  parent.appendChild(fallback)
                }}
              />
              <button onClick={() => setSidebarOpen(false)} style={{ color: '#D4A847' }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header
          style={{ backgroundColor: '#1A0505' }}
          className="flex items-center justify-between px-4 md:px-6 py-3 shadow-md shrink-0"
        >
          <div className="flex items-center gap-3">
            <button
              style={{ color: '#D4A847' }}
              className="md:hidden p-2 -ml-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span style={{ color: '#D4A847', fontWeight: 'bold' }} className="text-sm md:text-base">
              New Look Beauty Salon
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{ backgroundColor: '#D4A847', color: '#1A0505', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            className="flex items-center gap-2 text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
