import { OrderStatus } from '@/types'

const config: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'badge-pending' },
  confirmed: { label: 'Confirmed', className: 'badge-confirmed' },
  shipped:   { label: 'Shipped',   className: 'badge-shipped' },
  delivered: { label: 'Delivered', className: 'badge-delivered' },
  cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
  returned:  { label: 'Returned',  className: 'badge-returned' },
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = config[status] || config.pending
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {label}
    </span>
  )
}
