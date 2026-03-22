'use client'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'

const courierColors: Record<string, string> = { steadfast: 'var(--green)', pathao: 'var(--accent)', redx: 'var(--orange)' }

export default function DeliveryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api.get('/api/delivery').then(r => r.data),
    refetchInterval: 30_000,
  })

  const deliveries = data?.deliveries || []

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[['steadfast', '🟢 Steadfast', '৳110–৳130'], ['pathao', '🔵 Pathao', '৳100–৳150'], ['redx', '🟠 Redx', '৳80–৳120']].map(([key, name, rate]) => (
          <div key={key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{name.split(' ')[0]}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{name.split(' ').slice(1).join(' ')}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{rate}</div>
            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontWeight: 600 }}>
              Configure in Settings →
            </span>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700 }}>📦 All Deliveries</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Order', 'Customer', 'Courier', 'Tracking', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array(5).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={7} style={{ padding: '11px 16px' }}><div className="skeleton" style={{ height: 16 }} /></td></tr>
            )) : deliveries.map((d: any) => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 16px', fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--text3)' }}>{d.orders?.order_number}</td>
                <td style={{ padding: '11px 16px', fontWeight: 600 }}>{d.orders?.customer_name}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: courierColors[d.courier] || 'var(--text2)', textTransform: 'capitalize' }}>{d.courier}</span>
                </td>
                <td style={{ padding: '11px 16px', fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--accent)' }}>{d.tracking_code || '—'}</td>
                <td style={{ padding: '11px 16px', fontFamily: "'JetBrains Mono'", fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>৳{d.amount_to_collect}</td>
                <td style={{ padding: '11px 16px' }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--surface3)', color: 'var(--text2)', fontWeight: 600, textTransform: 'capitalize' }}>{d.status?.replace(/_/g, ' ')}</span>
                </td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text3)' }}>{format(new Date(d.created_at), 'dd MMM yy')}</td>
              </tr>
            ))}
            {!isLoading && deliveries.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No deliveries yet. Create parcels from confirmed orders.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
