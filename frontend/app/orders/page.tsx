'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Order, OrderStatus } from '@/types'
import StatusBadge from '@/components/orders/StatusBadge'
import SourceBadge from '@/components/orders/SourceBadge'
import OrderDrawer from '@/components/orders/OrderDrawer'
import CreateOrderModal from '@/components/orders/CreateOrderModal'
import toast from 'react-hot-toast'
import { Plus, Download, LayoutGrid, List, Search } from 'lucide-react'
import { format } from 'date-fns'

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered']

export default function OrdersPage() {
  const qc = useQueryClient()
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterDate, setFilterDate] = useState('today')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const params = new URLSearchParams()
  if (filterStatus) params.set('status', filterStatus)
  if (filterSource) params.set('source', filterSource)
  if (filterDate) params.set('date', filterDate)
  if (search) params.set('search', search)
  params.set('limit', '100')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filterStatus, filterSource, filterDate, search],
    queryFn: () => api.get(`/api/orders?${params}`).then(r => r.data),
    refetchInterval: 30_000,
  })

  const orders: Order[] = data?.orders || []

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch(`/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      toast.success('Status updated!')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const byStatus = (s: OrderStatus) => orders.filter(o => o.status === s)

  const exportCSV = () => {
    const rows = [
      ['Order #', 'Customer', 'Phone', 'Address', 'Product', 'Qty', 'Amount', 'Status', 'Source', 'Date'],
      ...orders.map(o => [
        o.order_number, o.customer_name, o.customer_phone, o.customer_address,
        o.product_name, o.quantity, o.total_amount, o.status, o.source,
        format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click()
    toast.success('CSV exported!')
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', color: 'var(--text)', fontSize: 12.5, outline: 'none', width: 180, fontFamily: 'Sora' }}
          />
        </div>
        {[
          { value: filterStatus, onChange: setFilterStatus, options: [['', 'All Status'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']] },
          { value: filterSource, onChange: setFilterSource, options: [['', 'All Sources'], ['facebook', 'Facebook'], ['whatsapp', 'WhatsApp'], ['manual', 'Manual']] },
          { value: filterDate, onChange: setFilterDate, options: [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['', 'All Time']] },
        ].map((s, i) => (
          <select key={i} value={s.value} onChange={e => s.onChange(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12.5, cursor: 'pointer', outline: 'none', fontFamily: 'Sora' }}>
            {s.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ))}

        <button onClick={() => setShowCreate(true)}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora' }}>
          <Plus size={14} /> New Order
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['kanban', 'table'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? 'white' : 'var(--text3)', transition: 'all 0.15s' }}>
              {v === 'kanban' ? <LayoutGrid size={14} /> : <List size={14} />}
            </button>
          ))}
        </div>

        <button onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Sora' }}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* KANBAN VIEW */}
      {view === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STATUSES.map(status => {
            const cols: Record<OrderStatus, { color: string; label: string }> = {
              pending: { color: 'var(--yellow)', label: 'Pending' },
              confirmed: { color: 'var(--accent)', label: 'Confirmed' },
              shipped: { color: '#a78bfa', label: 'Shipped' },
              delivered: { color: 'var(--green)', label: 'Delivered' },
              cancelled: { color: 'var(--red)', label: 'Cancelled' },
              returned: { color: 'var(--orange)', label: 'Returned' },
            }
            const { color, label } = cols[status]
            const colOrders = byStatus(status)
            return (
              <div key={status} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, minHeight: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color }}>{label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, background: 'var(--surface3)', padding: '1px 8px', borderRadius: 20, fontFamily: "'JetBrains Mono'" }}>{colOrders.length}</span>
                </div>
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8, marginBottom: 8 }} />
                  ))
                ) : colOrders.map(order => (
                  <div key={order.id} onClick={() => setSelectedOrder(order)}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono'", marginBottom: 5 }}>
                      {order.order_number} · {format(new Date(order.created_at), 'dd MMM HH:mm')}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{order.customer_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{order.product_name}{order.product_variant ? ` (${order.product_variant})` : ''}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <SourceBadge source={order.source} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono'" }}>৳{order.total_amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {view === 'table' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order #', 'Customer', 'Phone', 'Product', 'Amount', 'Status', 'Source', 'Date', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={9} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 16 }} /></td></tr>
                ))
              ) : orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(order)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--text3)' }}>{order.order_number}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{order.customer_name}</td>
                  <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono'", fontSize: 12 }}>{order.customer_phone}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text2)' }}>{order.product_name}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--green)', fontFamily: "'JetBrains Mono'" }}>৳{order.total_amount}</td>
                  <td style={{ padding: '11px 14px' }}><StatusBadge status={order.status} /></td>
                  <td style={{ padding: '11px 14px' }}><SourceBadge source={order.source} /></td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text3)' }}>{format(new Date(order.created_at), 'dd MMM yy')}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={e => { e.stopPropagation(); setSelectedOrder(order) }}
                      style={{ fontSize: 11, padding: '4px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Sora' }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && orders.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order detail drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        />
      )}

      {/* Create modal */}
      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
