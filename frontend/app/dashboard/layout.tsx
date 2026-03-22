'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard, ShoppingBag, MessageSquare, Package,
  Truck, Users, BarChart2, Settings, LogOut, Bell, Zap
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { href: '/orders', label: 'Orders', icon: ShoppingBag, badge: '12', section: 'main' },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare, badge: '5', section: 'main' },
  { href: '/products', label: 'Products', icon: Package, section: 'main' },
  { href: '/delivery', label: 'Delivery', icon: Truck, section: 'ops' },
  { href: '/customers', label: 'Customers', icon: Users, section: 'ops' },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, section: 'ops' },
  { href: '/settings', label: 'Settings', icon: Settings, section: 'account' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, initFromStorage, logout } = useAuthStore()

  useEffect(() => {
    initFromStorage()
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [isLoading, user])

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  const sections = {
    main: navItems.filter(n => n.section === 'main'),
    ops: navItems.filter(n => n.section === 'ops'),
    account: navItems.filter(n => n.section === 'account'),
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{
        width: 220, minWidth: 220, background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 0', height: '100vh', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Inbox<span style={{ color: 'var(--accent)' }}>2</span>Order
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
            F-Commerce CRM
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
          {(['main', 'ops', 'account'] as const).map(section => (
            <div key={section} style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '8px 8px 4px' }}>
                {section === 'main' ? 'Main' : section === 'ops' ? 'Operations' : 'Account'}
              </div>
              {sections[section].map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, marginBottom: 1,
                    color: active ? 'var(--accent)' : 'var(--text2)',
                    background: active ? 'var(--accent-glow)' : 'transparent',
                    fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
                    position: 'relative', transition: 'all 0.15s'
                  }}>
                    {active && (
                      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: 'var(--accent)', borderRadius: '0 3px 3px 0' }} />
                    )}
                    <Icon size={15} strokeWidth={2} />
                    <span>{label}</span>
                    {badge && (
                      <span style={{ marginLeft: 'auto', background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, fontFamily: "'JetBrains Mono'" }}>
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding: '16px 12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
          {/* Plan badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', background: 'rgba(79,110,247,0.08)', borderRadius: 8, border: '1px solid rgba(79,110,247,0.15)' }}>
            <Zap size={12} color="var(--accent)" />
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textTransform: 'capitalize' }}>{user.plan} Plan</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, color: 'white' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.shop_name}</div>
            </div>
            <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 6 }} title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ padding: '0 24px', height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>
              {navItems.find(n => n.href === pathname || (n.href !== '/dashboard' && pathname.startsWith(n.href)))?.label || 'Dashboard'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="🔍  Search..."
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: 'var(--text)', fontSize: 13, width: 200, outline: 'none', fontFamily: 'Sora' }}
            />
            <button style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
              <Bell size={16} color="var(--text2)" />
              <div style={{ position: 'absolute', top: 7, right: 7, width: 6, height: 6, background: 'var(--red)', borderRadius: '50%', border: '1.5px solid var(--surface)' }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div className="fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
