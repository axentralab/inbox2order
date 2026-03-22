'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

interface OrderForm {
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_district: string
  product_name: string
  product_variant: string
  quantity: number
  unit_price: number
  delivery_charge: number
  source: string
  notes: string
}

export default function CreateOrderModal({ onClose, prefill }: { onClose: () => void; prefill?: Partial<OrderForm> }) {
  const qc = useQueryClient()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<OrderForm>({
    defaultValues: { quantity: 1, delivery_charge: 70, source: 'manual', ...prefill }
  })

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/api/products').then(r => r.data),
  })

  const qty = watch('quantity') || 1
  const price = watch('unit_price') || 0
  const delivery = watch('delivery_charge') || 0
  const total = (qty * price) + Number(delivery)

  const create = useMutation({
    mutationFn: (data: OrderForm) => api.post('/api/orders', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order-stats'] })
      const warning = res.data.fraud_warning
      if (warning) {
        toast.error(`⚠️ Fraud warning: ${warning.reasons.join(', ')}`, { duration: 6000 })
      } else {
        toast.success(`Order ${res.data.order.order_number} created!`)
      }
      onClose()
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create order'),
  })

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 200 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, zIndex: 201, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>➕ New Order</div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => create.mutate(d))}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Customer Name *" error={errors.customer_name?.message}>
              <input {...register('customer_name', { required: 'Required' })} placeholder="Fatema Begum" style={inputSt} />
            </Field>
            <Field label="Phone *" error={errors.customer_phone?.message}>
              <input {...register('customer_phone', { required: 'Required' })} placeholder="01712-345678" style={inputSt} />
            </Field>
          </div>

          <Field label="Delivery Address *" error={errors.customer_address?.message} style={{ marginBottom: 12 }}>
            <input {...register('customer_address', { required: 'Required' })} placeholder="House, Road, Area, City" style={inputSt} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Product Name *" error={errors.product_name?.message}>
              <input {...register('product_name', { required: 'Required' })} placeholder="Sharee (Pink)" list="products-list" style={inputSt} />
              <datalist id="products-list">
                {productsData?.products?.map((p: any) => <option key={p.id} value={p.name} />)}
              </datalist>
            </Field>
            <Field label="Variant (optional)">
              <input {...register('product_variant')} placeholder="Size M, Blue color..." style={inputSt} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Qty" error={errors.quantity?.message}>
              <input {...register('quantity', { required: true, min: 1, valueAsNumber: true })} type="number" min={1} style={inputSt} />
            </Field>
            <Field label="Unit Price (৳)" error={errors.unit_price?.message}>
              <input {...register('unit_price', { required: 'Required', valueAsNumber: true })} type="number" placeholder="500" style={inputSt} />
            </Field>
            <Field label="Delivery (৳)">
              <input {...register('delivery_charge', { valueAsNumber: true })} type="number" style={inputSt} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <Field label="Source">
              <select {...register('source')} style={inputSt}>
                <option value="manual">Manual</option>
                <option value="facebook">Facebook</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
            <Field label="District">
              <input {...register('customer_district')} placeholder="Dhaka" style={inputSt} />
            </Field>
          </div>

          <Field label="Notes" style={{ marginBottom: 16 }}>
            <textarea {...register('notes')} placeholder="Optional notes..." rows={2} style={{ ...inputSt, resize: 'none' }} />
          </Field>

          {/* Total */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Total Amount</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', fontFamily: "'JetBrains Mono'" }}>৳{total.toFixed(0)}</span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '11px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sora' }}>Cancel</button>
            <button type="submit" disabled={create.isPending} style={{ flex: 2, padding: '11px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora' }}>
              {create.isPending ? 'Creating...' : '✓ Create Order'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Field({ label, children, error, style }: { label: string; children: React.ReactNode; error?: string; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 10, color: 'var(--red)', marginTop: 3 }}>{error}</p>}
    </div>
  )
}

const inputSt: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none' }
