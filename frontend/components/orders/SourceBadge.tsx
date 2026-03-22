import { OrderSource } from '@/types'

export default function SourceBadge({ source }: { source: OrderSource }) {
  const map = {
    facebook: { label: 'FB', className: 'source-fb' },
    whatsapp: { label: 'WA', className: 'source-wa' },
    manual:   { label: 'Manual', className: 'source-manual' },
  }
  const { label, className } = map[source] || map.manual
  return (
    <span className={className} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
      {label}
    </span>
  )
}
