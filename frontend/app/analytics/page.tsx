'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Package, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function AnalyticsPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/api/analytics/overview').then(r => r.data),
  })

  const { data: dailyData } = useQuery({
    queryKey: ['daily-analytics'],
    queryFn: () => api.get('/api/analytics/daily').then(r => r.data),
  })

  const chartData = (dailyData?.daily || []).map((d: any) => ({
    name: format(new Date(d.date), 'dd MMM'),
    orders: d.total,
    delivered: d.delivered,
    cancelled: d.cancelled,
  }))

  const stats = [
    { label: 'Monthly Orders', value: overview?.month_orders ?? 0, icon: Package, color: 'var(--accent)', change: overview?.growth_percent },
    { label: 'Delivered', value: overview?.delivered ?? 0, icon: TrendingUp, color: 'var(--green)' },
    { label: 'Conversion Rate', value: `${overview?.conversion_rate ?? 0}%`, icon: TrendingUp, color: 'var(--yellow)' },
    { label: 'Cancel Rate', value: `${overview?.cancel_rate ?? 0}%`, icon: TrendingDown, color: 'var(--red)' },
    { label: 'Total Customers', value: overview?.total_customers ?? 0, icon: Users, color: '#a78bfa' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</span>
              <Icon size={14} color={color} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'JetBrains Mono'" }}>{value}</div>
            {change !== undefined && (
              <div style={{ fontSize: 11, color: change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
                {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📈 Daily Orders (Last 30 Days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
              <Area type="monotone" dataKey="orders" stroke="var(--accent)" strokeWidth={2} fill="url(#ordersGrad)" />
              <Area type="monotone" dataKey="delivered" stroke="var(--green)" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🏆 Top Products</div>
          {(overview?.top_products || []).map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono'", color: 'var(--text3)' }}>{p.total_sold}</span>
              </div>
              <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((p.total_sold / 200) * 100, 100)}%`, background: 'linear-gradient(90deg,var(--accent),var(--accent2))', borderRadius: 3 }} />
              </div>
            </div>
          ))}
          {!overview?.top_products?.length && (
            <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', paddingTop: 16 }}>No data yet</p>
          )}
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 Order Status Breakdown</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Delivered', value: overview?.conversion_rate || 0, color: 'var(--green)' },
            { label: 'Pending', value: 17, color: 'var(--yellow)' },
            { label: 'Confirmed', value: 9, color: 'var(--accent)' },
            { label: 'Cancelled', value: overview?.cancel_rate || 0, color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono'" }}>{s.value}%</div>
              <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.value}%`, background: s.color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
