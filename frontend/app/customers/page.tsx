'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Customer } from '@/types'
import toast from 'react-hot-toast'
import { Search, Flag } from 'lucide-react'

export default function CustomersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, flaggedOnly],
    queryFn: () => api.get(`/api/customers?search=${search}&flagged=${flaggedOnly}`).then(r => r.data),
  })

  const toggleFlag = useMutation({
    mutationFn: ({ id, is_flagged }: { id: string; is_flagged: boolean }) =>
      api.patch(`/api/customers/${id}/flag`, { is_flagged, flag_reason: is_flagged ? 'Manually flagged' : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer updated!') },
  })

  const customers: Customer[] = data?.customers || []

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..."
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', color: 'var(--text)', fontSize: 12.5, outline: 'none', width: 220, fontFamily: 'Sora' }} />
        </div>
        <button onClick={() => setFlaggedOnly(!flaggedOnly)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid', borderColor: flaggedOnly ? 'var(--red)' : 'var(--border)', background: flaggedOnly ? 'rgba(239,68,68,0.1)' : 'var(--surface)', color: flaggedOnly ? 'var(--red)' : 'var(--text2)', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Sora', fontWeight: 500 }}>
          <Flag size={13} /> {flaggedOnly ? 'All Customers' : 'Flagged Only'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{customers.length} customers</span>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Customer', 'Phone', 'Total Orders', 'Total Spent', 'Cancels', 'Source', 'Status', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array(6).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={8} style={{ padding: '11px 14px' }}><div className="skeleton" style={{ height: 16 }} /></td></tr>
            )) : customers.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono'", fontSize: 12 }}>{c.phone}</td>
                <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--accent)' }}>{c.total_orders}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono'", fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>৳{c.total_spent}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontWeight: 700, color: c.cancel_count >= 3 ? 'var(--red)' : c.cancel_count >= 1 ? 'var(--yellow)' : 'var(--text3)' }}>{c.cancel_count}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700, background: c.source === 'facebook' ? 'rgba(24,119,242,0.12)' : c.source === 'whatsapp' ? 'rgba(37,211,102,0.12)' : 'rgba(139,144,167,0.12)', color: c.source === 'facebook' ? '#60a5fa' : c.source === 'whatsapp' ? '#4ade80' : '#8b90a7' }}>
                    {c.source?.toUpperCase() || 'MANUAL'}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {c.is_flagged ? (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', fontWeight: 600 }}>🚨 Flagged</span>
                  ) : c.total_orders >= 10 ? (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.1)', color: 'var(--yellow)', fontWeight: 600 }}>⭐ VIP</span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontWeight: 600 }}>Regular</span>
                  )}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <button onClick={() => toggleFlag.mutate({ id: c.id, is_flagged: !c.is_flagged })}
                    style={{ fontSize: 11, padding: '4px 10px', background: c.is_flagged ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${c.is_flagged ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 6, color: c.is_flagged ? 'var(--green)' : 'var(--red)', cursor: 'pointer', fontFamily: 'Sora' }}>
                    {c.is_flagged ? 'Unflag' : '🚩 Flag'}
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && customers.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
