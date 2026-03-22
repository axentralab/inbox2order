'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import api from '@/lib/api'
import { Order, OrderStatus } from '@/types'
import {
  Zap, MessageSquare, Package, Clock, XCircle,
  TrendingUp, Plus, ShieldAlert, RefreshCw, ChevronRight, Bot, Truck
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import StatusBadge from '@/components/orders/StatusBadge'
import SourceBadge from '@/components/orders/SourceBadge'
import CreateOrderModal from '@/components/orders/CreateOrderModal'
import OrderDrawer from '@/components/orders/OrderDrawer'
import toast from 'react-hot-toast'

const QUICK_FILTERS = ['All', 'Today', 'Pending', 'Delivered']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [quickFilter, setQuickFilter] = useState('Today')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => api.get('/api/orders/stats/summary').then(r => r.data),
    refetchInterval: 30_000,
  })

  const { data: convData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/api/messages/conversations').then(r => r.data),
    refetchInterval: 15_000,
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders', quickFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '8' })
      if (quickFilter === 'Today') params.set('date', 'today')
      if (quickFilter === 'Pending') params.set('status', 'pending')
      if (quickFilter === 'Delivered') params.set('status', 'delivered')
      return api.get(`/api/orders?${params}`).then(r => r.data)
    },
    refetchInterval: 30_000,
  })

  const { data: analyticsData } = useQuery({
    queryKey: ['daily-analytics'],
    queryFn: () => api.get('/api/analytics/daily').then(r => r.data),
  })

  const { data: flaggedData } = useQuery({
    queryKey: ['flagged-customers'],
    queryFn: () => api.get('/api/customers?flagged=true').then(r => r.data),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/api/products').then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recent-orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      toast.success('Status updated!')
      setSelectedOrder(null)
    },
  })

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const found = analyticsData?.daily?.find((x: any) => x.date === dateStr)
    return { name: format(d, 'EEE'), orders: found?.total || 0, delivered: found?.delivered || 0 }
  })

  const unreadCount = convData?.conversations?.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0) || 0
  const convertableCount = convData?.conversations?.filter((c: any) => c.unread_count > 0).length || 0
  const todayTotal = stats?.today_total || 0
  const flagged = flaggedData?.customers?.slice(0, 4) || []
  const orders: Order[] = ordersData?.orders || []
  const hoursSaved = ((todayTotal * 3) / 60).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* HERO BAR */}
      <div style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.15) 0%, rgba(124,58,237,0.08) 100%)', border: '1px solid rgba(79,110,247,0.25)', borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{format(new Date(), 'EEEE, dd MMMM yyyy')}</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{user?.shop_name} · <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{user?.plan} plan</span></div>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Bot size={14} color="var(--green)" /><span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Saved You</span></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)', fontFamily: "'JetBrains Mono'", lineHeight: 1 }}>{hoursSaved}h</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>today</div>
        </div>
        <div style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Zap size={14} color="var(--accent)" /><span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto Captured</span></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', fontFamily: "'JetBrains Mono'", lineHeight: 1 }}>{todayTotal}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>orders today</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora', boxShadow: '0 4px 20px rgba(79,110,247,0.4)' }}>
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: "Today's Orders", value: stats?.today_total ?? 0, icon: Package, color: 'var(--accent)', bg: 'rgba(79,110,247,0.08)', link: '/orders' },
          { label: 'Delivered', value: stats?.delivered_today ?? 0, icon: TrendingUp, color: 'var(--green)', bg: 'rgba(34,197,94,0.08)', link: '/orders' },
          { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, color: 'var(--yellow)', bg: 'rgba(245,158,11,0.08)', link: '/orders' },
          { label: 'Cancelled', value: stats?.cancelled_today ?? 0, icon: XCircle, color: 'var(--red)', bg: 'rgba(239,68,68,0.08)', link: '/orders' },
        ].map(({ label, value, icon: Icon, color, bg, link }) => (
          statsLoading ? <div key={label} className="skeleton" style={{ height: 90, borderRadius: 14 }} /> :
          <Link key={label} href={link} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}>
              <div style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={color} /></div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'JetBrains Mono'", letterSpacing: '-1px' }}>{value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* INBOX + FRAUD WIDGETS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link href="/inbox" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(79,110,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <MessageSquare size={22} color="var(--accent)" />
              {unreadCount > 0 && <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 800, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{unreadCount > 9 ? '9+' : unreadCount}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{unreadCount > 0 ? `${unreadCount} Unread Messages` : 'Inbox Clear ✓'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {convertableCount > 0 ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>⚡ {convertableCount} convertable to order</span> : 'No pending conversions'}
              </div>
            </div>
            <ChevronRight size={16} color="var(--text3)" />
          </div>
        </Link>
        <div style={{ background: 'var(--surface)', border: `1px solid ${flagged.length > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: flagged.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(139,144,167,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldAlert size={22} color={flagged.length > 0 ? 'var(--red)' : 'var(--text3)'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{flagged.length > 0 ? `🚨 ${flagged.length} Fraud Alerts` : '✅ No Fraud Alerts'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{flagged.length > 0 ? flagged.slice(0, 2).map((c: any) => c.name).join(', ') : 'All customers look clean'}</div>
          </div>
          {flagged.length > 0 && <Link href="/customers?flagged=true" style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>View →</Link>}
        </div>
      </div>

      {/* ORDERS TABLE + CHART */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, marginRight: 4 }}>Recent Orders</span>
            {QUICK_FILTERS.map(f => (
              <button key={f} onClick={() => setQuickFilter(f)} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora', transition: 'all 0.15s', background: quickFilter === f ? 'var(--accent)' : 'var(--surface3)', color: quickFilter === f ? 'white' : 'var(--text3)' }}>{f}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => qc.invalidateQueries({ queryKey: ['recent-orders'] })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><RefreshCw size={13} /></button>
              <Link href="/orders" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>All →</Link>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order', 'Customer', 'Product', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 14px', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={5} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 14 }} /></td></tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                  No orders · <button onClick={() => setShowCreate(true)} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Create one?</button>
                </td></tr>
              ) : orders.map((order: Order) => (
                <tr key={order.id} onClick={() => setSelectedOrder(order)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: 'var(--text3)' }}>{order.order_number}</div>
                    <SourceBadge source={order.source} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono'" }}>{order.customer_phone}</div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text2)', fontSize: 12 }}>{order.product_name}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={order.status} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    {order.status === 'pending' && (
                      <button onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: 'confirmed' }) }}
                        style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.2)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Sora' }}>
                        ✓ Confirm
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button onClick={e => { e.stopPropagation(); updateStatus.mutate({ id: order.id, status: 'shipped' }) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '4px 8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer', fontWeight: 600, fontFamily: 'Sora' }}>
                        <Truck size={10} /> Ship
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📈 This Week</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 11 }} cursor={{ fill: 'rgba(79,110,247,0.06)' }} />
                <Bar dataKey="orders" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="delivered" fill="var(--green)" radius={[3, 3, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🏆 Top Products</div>
            {productsData?.products?.slice(0, 3).map((p: any, i: number) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono'", width: 14 }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 3, marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((p.total_sold / 200) * 100, 100)}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono'" }}>{p.total_sold}</span>
              </div>
            ))}
            {!productsData?.products?.length && <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>No products yet</p>}
          </div>
        </div>
      </div>

      {/* SCARY FRAUD TABLE */}
      {flagged.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={15} color="var(--red)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>🚨 Fraud Alerts — Review Immediately</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{flagged.length} flagged</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'Phone', 'Cancels', 'Tag', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 16px', fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flagged.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: 'rgba(239,68,68,0.02)' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '10px 16px', fontFamily: "'JetBrains Mono'", fontSize: 12 }}>{c.phone}</td>
                  <td style={{ padding: '10px 16px' }}><span style={{ fontWeight: 800, color: c.cancel_count >= 3 ? 'var(--red)' : 'var(--yellow)', fontSize: 14 }}>{c.cancel_count}×</span></td>
                  <td style={{ padding: '10px 16px' }}>
                    {c.cancel_count >= 5 || c.is_flagged
                      ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', color: 'var(--red)', fontWeight: 700 }}>⚠️ Risky</span>
                      : c.total_orders >= 10
                      ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: 'var(--yellow)', fontWeight: 700 }}>⭐ VIP</span>
                      : <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(249,115,22,0.12)', color: 'var(--orange)', fontWeight: 700 }}>🔶 Suspicious</span>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => api.patch(`/api/customers/${c.id}/flag`, { is_flagged: true, flag_reason: 'Blocked' }).then(() => { qc.invalidateQueries({ queryKey: ['flagged-customers'] }); toast.success('Blocked!') })}
                        style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Sora' }}>🚫 Block</button>
                      <button onClick={() => api.patch(`/api/customers/${c.id}/flag`, { is_flagged: false, flag_reason: null }).then(() => { qc.invalidateQueries({ queryKey: ['flagged-customers'] }); toast.success('Cleared!') })}
                        style={{ fontSize: 11, padding: '4px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, color: 'var(--green)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Sora' }}>✓ Clear</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}
      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />}
    </div>
  )
}
