'use client'
import { Order, OrderStatus } from '@/types'
import { X, Truck, Phone, MapPin, Package, CheckCircle } from 'lucide-react'
import StatusBadge from './StatusBadge'
import SourceBadge from './SourceBadge'
import { format } from 'date-fns'
import { useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface Props {
  order: Order
  onClose: () => void
  onStatusChange: (id: string, status: OrderStatus) => void
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered']
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped',
  delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned'
}

export default function OrderDrawer({ order, onClose, onStatusChange }: Props) {
  const qc = useQueryClient()
  const [creatingParcel, setCreatingParcel] = useState(false)
  const [selectedCourier, setSelectedCourier] = useState<'steadfast' | 'pathao'>('steadfast')
  const currentStepIdx = STATUS_FLOW.indexOf(order.status as OrderStatus)

  const createParcel = async () => {
    setCreatingParcel(true)
    try {
      await api.post('/api/delivery/create', { order_id: order.id, courier: selectedCourier })
      toast.success(`Parcel created with ${selectedCourier}! 🚚`)
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create parcel')
    } finally {
      setCreatingParcel(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 460,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 201, overflowY: 'auto', padding: 24,
        animation: 'slideIn 0.25s cubic-bezier(0.4,0,0.2,1)'
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{order.order_number}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={order.status} />
              <SourceBadge source={order.source} />
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text2)" />
          </button>
        </div>

        {/* Status flow */}
        {order.status !== 'cancelled' && order.status !== 'returned' && (
          <div style={{ marginBottom: 20, background: 'var(--surface2)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: 14 }}>Order Progress</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STATUS_FLOW.map((s, i) => {
                const done = i < currentStepIdx
                const current = i === currentStepIdx
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_FLOW.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                        background: done ? 'var(--accent)' : current ? 'rgba(245,158,11,0.15)' : 'var(--surface3)',
                        border: `2px solid ${done ? 'var(--accent)' : current ? 'var(--yellow)' : 'var(--border)'}`,
                        color: done ? 'white' : current ? 'var(--yellow)' : 'var(--text3)'
                      }}>
                        {done ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span style={{ fontSize: 9, color: current ? 'var(--yellow)' : done ? 'var(--accent)' : 'var(--text3)', fontWeight: current || done ? 600 : 400 }}>
                        {STATUS_LABELS[s]}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: done ? 'var(--accent)' : 'var(--border)', margin: '0 4px', marginBottom: 14 }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Customer info */}
        <Section title="👤 Customer Info">
          <InfoRow icon={<Phone size={13} />} label="Name" value={order.customer_name} />
          <InfoRow icon={<Phone size={13} />} label="Phone" value={order.customer_phone} mono />
          <InfoRow icon={<MapPin size={13} />} label="Address" value={order.customer_address} />
          {order.customer_district && <InfoRow label="District" value={order.customer_district} />}
        </Section>

        {/* Order details */}
        <Section title="📦 Order Details">
          <InfoRow icon={<Package size={13} />} label="Product" value={`${order.product_name}${order.product_variant ? ` (${order.product_variant})` : ''}`} />
          <InfoRow label="Qty" value={`×${order.quantity}`} />
          <InfoRow label="Unit Price" value={`৳${order.unit_price}`} mono />
          <InfoRow label="Delivery" value={`৳${order.delivery_charge}`} mono />
          <InfoRow label="Total" value={`৳${order.total_amount}`} mono highlight />
        </Section>

        {/* Delivery info */}
        {order.deliveries && order.deliveries.length > 0 && (
          <Section title="🚚 Delivery">
            <InfoRow label="Courier" value={order.deliveries[0].courier} />
            <InfoRow label="Tracking" value={order.deliveries[0].tracking_code || '—'} mono />
            <InfoRow label="Status" value={order.deliveries[0].courier_status || order.deliveries[0].status} />
          </Section>
        )}

        {/* Notes */}
        {order.notes && (
          <Section title="📝 Notes">
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{order.notes}</p>
          </Section>
        )}

        {/* Meta */}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20 }}>
          Created: {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {order.status === 'pending' && (
            <button onClick={() => onStatusChange(order.id, 'confirmed')} style={btnStyle('var(--accent)')}>✓ Confirm</button>
          )}
          {order.status === 'confirmed' && (
            <button onClick={() => onStatusChange(order.id, 'shipped')} style={btnStyle('#7c3aed')}>🚚 Mark Shipped</button>
          )}
          {order.status === 'shipped' && (
            <button onClick={() => onStatusChange(order.id, 'delivered')} style={btnStyle('var(--green)')}>✅ Mark Delivered</button>
          )}
          {!['delivered', 'cancelled', 'returned'].includes(order.status) && (
            <button onClick={() => onStatusChange(order.id, 'cancelled')} style={btnStyle('var(--red)', true)}>❌ Cancel</button>
          )}
        </div>

        {/* Create parcel */}
        {order.status === 'confirmed' && (!order.deliveries || order.deliveries.length === 0) && (
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Truck size={13} /> Send to Courier
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {(['steadfast', 'pathao'] as const).map(c => (
                <button key={c} onClick={() => setSelectedCourier(c)}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, border: `2px solid ${selectedCourier === c ? 'var(--accent)' : 'var(--border)'}`, background: selectedCourier === c ? 'var(--accent-glow)' : 'var(--surface3)', color: selectedCourier === c ? 'var(--accent)' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora', textTransform: 'capitalize' }}>
                  {c}
                </button>
              ))}
            </div>
            <button onClick={createParcel} disabled={creatingParcel}
              style={{ ...btnStyle('var(--accent)'), width: '100%' }}>
              {creatingParcel ? 'Creating parcel...' : `📦 Create Parcel with ${selectedCourier}`}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, marginBottom: 10 }}>{title}</div>
      <div style={{ background: 'var(--surface2)', borderRadius: 10, overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

function InfoRow({ icon, label, value, mono, highlight }: { icon?: React.ReactNode; label: string; value: string | number; mono?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>{icon}{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 600, fontFamily: mono || highlight ? "'JetBrains Mono'" : 'Sora', color: highlight ? 'var(--green)' : 'var(--text)' }}>{value}</span>
    </div>
  )
}

function btnStyle(color: string, ghost = false): React.CSSProperties {
  return {
    padding: '10px 14px', borderRadius: 8, border: ghost ? `1px solid ${color}` : 'none',
    background: ghost ? `${color}18` : color, color: ghost ? color : 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora', width: '100%'
  }
}
