'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Product } from '@/types'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function ProductsPage() {
  const qc = useQueryClient()
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/api/products').then(r => r.data),
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/api/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted') },
  })

  const products: Product[] = data?.products || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>{products.length} products</p>
        <button onClick={() => { setEditProduct(null); setShowForm(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora' }}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'Price', 'Stock', 'Total Sold', 'Category', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={6} style={{ padding: '12px 16px' }}><div className="skeleton" style={{ height: 16 }} /></td></tr>
            )) : products.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono'", fontSize: 12 }}>
                  ৳{p.price}{p.price_max ? `–${p.price_max}` : ''}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontWeight: 700, color: p.stock <= 5 ? 'var(--red)' : p.stock <= 20 ? 'var(--yellow)' : 'var(--green)' }}>
                    {p.stock <= 5 && <AlertTriangle size={11} style={{ marginRight: 3 }} />}{p.stock}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{p.total_sold}</td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text3)' }}>{p.category || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditProduct(p); setShowForm(true) }}
                      style={{ padding: '5px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text2)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Edit2 size={11} /> Edit
                    </button>
                    <button onClick={() => { if (confirm('Delete this product?')) deleteProduct.mutate(p.id) }}
                      style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: 'var(--red)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No products yet. Add your first product!</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && <ProductForm product={editProduct} onClose={() => setShowForm(false)} />}
    </div>
  )
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({ defaultValues: product || { price: 0, stock: 0 } })
  const save = useMutation({
    mutationFn: (data: any) => product ? api.put(`/api/products/${product.id}`, data) : api.post('/api/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success(product ? 'Product updated!' : 'Product added!'); onClose() },
    onError: () => toast.error('Failed to save product'),
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 201, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{product ? '✏️ Edit' : '➕ Add'} Product</div>
        <form onSubmit={handleSubmit(d => save.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>Product Name *</label><input {...register('name', { required: true })} style={inp} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Price (৳) *</label><input type="number" {...register('price', { valueAsNumber: true })} style={inp} /></div>
            <div><label style={lbl}>Max Price (৳)</label><input type="number" {...register('price_max', { valueAsNumber: true })} style={inp} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Stock</label><input type="number" {...register('stock', { valueAsNumber: true })} style={inp} /></div>
            <div><label style={lbl}>Category</label><input {...register('category')} placeholder="Clothing, Beauty..." style={inp} /></div>
          </div>
          <div><label style={lbl}>Description</label><textarea {...register('description')} rows={2} style={{ ...inp, resize: 'none' }} /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Sora', fontSize: 13, fontWeight: 600 }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontFamily: 'Sora', fontSize: 13, fontWeight: 700 }}>
              {save.isPending ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora', outline: 'none' }
