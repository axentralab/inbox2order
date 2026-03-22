export default function SkeletonCard({ height = 80 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height, borderRadius: 14, background: 'var(--surface2)' }}
    />
  )
}
