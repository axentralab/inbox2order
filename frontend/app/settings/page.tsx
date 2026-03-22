'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { CheckCircle, AlertCircle } from 'lucide-react'

const TABS = ['Profile', 'Integrations', 'Courier', 'Billing', 'Team']

export default function SettingsPage() {
  const [tab, setTab] = useState('Profile')

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface2)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: tab === t ? 700 : 500, background: tab === t ? 'var(--surface)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text3)', fontFamily: 'Sora', transition: 'all 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && <ProfileTab />}
      {tab === 'Integrations' && <IntegrationsTab />}
      {tab === 'Courier' && <CourierTab />}
      {tab === 'Billing' && <BillingTab />}
      {tab === 'Team' && <TeamTab />}
    </div>
  )
}

function ProfileTab() {
  const { user, setUser, token } = useAuthStore()
  const { register, handleSubmit } = useForm({ defaultValues: { name: user?.name, shop_name: user?.shop_name, phone: user?.phone } })
  const update = useMutation({
    mutationFn: (data: any) => api.put('/api/auth/profile', data),
    onSuccess: (res) => { setUser(res.data.user, token!); toast.success('Profile updated!') },
    onError: () => toast.error('Failed to update profile'),
  })

  return (
    <div style={{ maxWidth: 480 }}>
      <Card title="👤 Profile Settings">
        <form onSubmit={handleSubmit(d => update.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Full Name"><input {...register('name')} style={inp} /></Field>
          <Field label="Shop Name"><input {...register('shop_name')} style={inp} /></Field>
          <Field label="Phone"><input {...register('phone')} style={inp} /></Field>
          <Field label="Email"><input value={user?.email} disabled style={{ ...inp, opacity: 0.5 }} /></Field>
          <Field label="Current Plan">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ padding: '6px 14px', background: 'rgba(79,110,247,0.1)', color: 'var(--accent)', borderRadius: 8, fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{user?.plan}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>· {user?.plan_order_limit} orders/month</span>
            </div>
          </Field>
          <button type="submit" disabled={update.isPending} style={btnPrimary}>
            {update.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Card>
    </div>
  )
}

function IntegrationsTab() {
  const [fbToken, setFbToken] = useState('')
  const [fbPageId, setFbPageId] = useState('')
  const [waToken, setWaToken] = useState('')
  const [waPhoneId, setWaPhoneId] = useState('')

  const connectFB = async () => {
    if (!fbToken || !fbPageId) return toast.error('Enter token and page ID')
    try {
      await api.post('/api/messages/connect/facebook', { access_token: fbToken, page_id: fbPageId, page_name: 'My Page' })
      toast.success('Facebook connected! ✅')
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const connectWA = async () => {
    if (!waToken || !waPhoneId) return toast.error('Enter token and phone number ID')
    try {
      await api.post('/api/messages/connect/whatsapp', { access_token: waToken, phone_number_id: waPhoneId })
      toast.success('WhatsApp connected! ✅')
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Facebook */}
      <Card title="📘 Facebook Messenger">
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6 }}>
          Facebook Developer console থেকে Page Access Token নিন। App → Products → Messenger → Settings → Token Generation।
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Page Access Token">
            <input value={fbToken} onChange={e => setFbToken(e.target.value)} placeholder="EAAxxxxxxxx..." style={inp} />
          </Field>
          <Field label="Page ID">
            <input value={fbPageId} onChange={e => setFbPageId(e.target.value)} placeholder="1234567890123" style={inp} />
          </Field>
          <Field label="Webhook URL (copy this to Facebook)">
            <div style={{ ...inp, background: 'var(--surface3)', fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--accent)', cursor: 'text' }}>
              {typeof window !== 'undefined' ? `${window.location.origin.replace('3000', '5000')}/api/webhooks/facebook` : 'https://your-backend.com/api/webhooks/facebook'}
            </div>
          </Field>
          <button onClick={connectFB} style={btnPrimary}>Connect Facebook</button>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card title="📱 WhatsApp Business API" style={{ marginTop: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6 }}>
          Meta Business Suite → WhatsApp → API Setup থেকে Access Token ও Phone Number ID নিন।
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Access Token (Permanent)">
            <input value={waToken} onChange={e => setWaToken(e.target.value)} placeholder="EAAxxxxxxxx..." style={inp} />
          </Field>
          <Field label="Phone Number ID">
            <input value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="1234567890123" style={inp} />
          </Field>
          <Field label="Webhook URL">
            <div style={{ ...inp, background: 'var(--surface3)', fontFamily: "'JetBrains Mono'", fontSize: 11, color: 'var(--accent)' }}>
              {typeof window !== 'undefined' ? `${window.location.origin.replace('3000', '5000')}/api/webhooks/whatsapp` : 'https://your-backend.com/api/webhooks/whatsapp'}
            </div>
          </Field>
          <button onClick={connectWA} style={btnPrimary}>Connect WhatsApp</button>
        </div>
      </Card>
    </div>
  )
}

function CourierTab() {
  const [sfKey, setSfKey] = useState('')
  const [sfSecret, setSfSecret] = useState('')
  const [ptKey, setPtKey] = useState('')
  const [ptSecret, setPtSecret] = useState('')

  const connect = async (courier: string, api_key: string, api_secret: string) => {
    if (!api_key || !api_secret) return toast.error('Enter API credentials')
    try {
      await api.post('/api/delivery/connect', { courier, api_key, api_secret })
      toast.success(`${courier} connected! 🚚`)
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed') }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Card title="🟢 Steadfast Courier">
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>portal.steadfast.com.bd → API থেকে credentials নিন।</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="API Key"><input value={sfKey} onChange={e => setSfKey(e.target.value)} placeholder="Your Steadfast API Key" style={inp} /></Field>
          <Field label="Secret Key"><input value={sfSecret} onChange={e => setSfSecret(e.target.value)} placeholder="Your Steadfast Secret Key" type="password" style={inp} /></Field>
          <button onClick={() => connect('steadfast', sfKey, sfSecret)} style={btnPrimary}>Connect Steadfast</button>
        </div>
      </Card>
      <Card title="🔵 Pathao Courier" style={{ marginTop: 14 }}>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>merchant.pathao.com → API Credentials থেকে নিন।</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Client ID"><input value={ptKey} onChange={e => setPtKey(e.target.value)} placeholder="Pathao Client ID" style={inp} /></Field>
          <Field label="Client Secret"><input value={ptSecret} onChange={e => setPtSecret(e.target.value)} placeholder="Pathao Client Secret" type="password" style={inp} /></Field>
          <button onClick={() => connect('pathao', ptKey, ptSecret)} style={btnPrimary}>Connect Pathao</button>
        </div>
      </Card>
    </div>
  )
}

function BillingTab() {
  const { user } = useAuthStore()
  const plans = [
    { key: 'free', name: 'Free', price: '৳0', limit: '30 orders/mo', features: ['Basic dashboard', 'Manual entry', 'CSV export'] },
    { key: 'starter', name: 'Starter', price: '৳499', limit: '200 orders/mo', features: ['FB Messenger sync', 'Basic analytics', 'Email support'] },
    { key: 'pro', name: 'Pro ⚡', price: '৳999', limit: 'Unlimited orders', features: ['FB + WhatsApp', 'Courier API', 'AI extraction', 'Fraud detection'], popular: true },
    { key: 'business', name: 'Business', price: '৳1,999', limit: 'Unlimited + Team', features: ['Everything in Pro', '5 team members', 'Priority support', 'Custom reports'] },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {plans.map(p => (
          <div key={p.key} style={{ background: 'var(--surface)', border: `2px solid ${user?.plan === p.key ? 'var(--accent)' : p.popular ? 'rgba(79,110,247,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: 20, position: 'relative', textAlign: 'center' }}>
            {p.popular && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>⚡ Most Popular</div>}
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>{p.price}<span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'Sora' }}>/mo</span></div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>{p.limit}</div>
            <div style={{ textAlign: 'left', marginBottom: 16 }}>
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CheckCircle size={11} color="var(--green)" />{f}
                </div>
              ))}
            </div>
            <button style={{ width: '100%', padding: '9px', borderRadius: 8, border: user?.plan === p.key ? 'none' : '1px solid var(--border)', background: user?.plan === p.key ? 'var(--accent)' : 'var(--surface2)', color: user?.plan === p.key ? 'white' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'Sora' }}
              onClick={() => toast('Payment integration coming soon! 💳', { icon: '⏳' })}>
              {user?.plan === p.key ? '✓ Current Plan' : user?.plan === 'free' ? 'Upgrade' : 'Switch'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamTab() {
  return (
    <div style={{ maxWidth: 480 }}>
      <Card title="👥 Team Members">
        <p style={{ fontSize: 13, color: 'var(--text3)', padding: '16px 0' }}>Team feature available on Business plan. Upgrade to add staff members.</p>
        <button style={btnPrimary} onClick={() => toast('Upgrade to Business plan!', { icon: '⭐' })}>Upgrade to Business →</button>
      </Card>
    </div>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, ...style }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora', outline: 'none' }
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Sora' }
