'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', data)
      setUser(res.data.user, res.data.token)
      toast.success(`Welcome back, ${res.data.user.name}! 👋`)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Inbox<span style={{ color: 'var(--accent)' }}>2</span>Order
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>F-Commerce CRM</div>
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Bangladesh-er<br />
            <span style={{ color: 'var(--accent)' }}>লাখো seller-এর</span><br />
            daily habit
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.7 }}>
            Facebook ও WhatsApp-এর message থেকে<br />
            automatically order create করুন।<br />
            আর কখনো order miss করবেন না।
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 40 }}>
            {[['10K+', 'Active Sellers'], ['98%', 'Uptime'], ['৳0', 'Setup Cost']].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: "'JetBrains Mono'" }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>© 2026 Inbox2Order · Made for Bangladesh 🇧🇩</div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: '100%', maxWidth: 400 }} className="fade-up">
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Inbox<span style={{ color: 'var(--accent)' }}>2</span>Order</div>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>আবার স্বাগতম 👋</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 32 }}>
            Account নেই? <Link href="/auth/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register করুন →</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                type="email"
                placeholder="your@email.com"
                style={inputStyle}
              />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 characters' } })}
                type="password"
                placeholder="••••••••"
                style={inputStyle}
              />
              {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Logging in...
              </span> : 'Login করুন →'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: 14, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Account</p>
            <p style={{ fontSize: 12, color: 'var(--text2)', fontFamily: "'JetBrains Mono'" }}>demo@inbox2order.com / demo123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none' }
const btnPrimaryStyle: React.CSSProperties = { width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, fontFamily: 'Sora, sans-serif', cursor: 'pointer', marginTop: 8 }
const errorStyle: React.CSSProperties = { fontSize: 11, color: 'var(--red)', marginTop: 4 }
