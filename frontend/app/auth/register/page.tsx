'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface RegisterForm {
  name: string
  email: string
  password: string
  shop_name: string
  phone: string
}

export default function RegisterPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', data)
      setUser(res.data.user, res.data.token)
      toast.success('Account তৈরি হয়েছে! 🎉')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 440 }} className="fade-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Inbox<span style={{ color: 'var(--accent)' }}>2</span>Order</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 20, marginBottom: 6 }}>শুরু করুন বিনামূল্যে 🚀</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Account আছে? <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Login করুন →</Link>
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>আপনার নাম *</label>
                <input {...register('name', { required: 'Name required' })} placeholder="Fatema Begum" style={inputStyle} />
                {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
              </div>
              <div>
                <label style={labelStyle}>Shop Name</label>
                <input {...register('shop_name')} placeholder="Rima Fashion" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Email *</label>
              <input {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} type="email" placeholder="you@email.com" style={inputStyle} />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>

            <div>
              <label style={labelStyle}>Phone Number</label>
              <input {...register('phone')} placeholder="01712-345678" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Password *</label>
              <input {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 characters' } })} type="password" placeholder="Min 6 characters" style={inputStyle} />
              {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Creating account...' : 'Account Create করুন →'}
            </button>
          </form>

          <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Register করলে আমাদের <span style={{ color: 'var(--accent)' }}>Terms of Service</span> এবং <span style={{ color: 'var(--accent)' }}>Privacy Policy</span>-তে সম্মত হচ্ছেন।
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 20 }}>
          {[['✓', 'Free forever plan'], ['✓', 'No credit card'], ['✓', 'Setup in 5 min']].map(([icon, text]) => (
            <div key={text} style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 4 }}>
              <span style={{ color: 'var(--green)' }}>{icon}</span>{text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none' }
const btnStyle: React.CSSProperties = { width: '100%', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4, fontFamily: 'Sora, sans-serif' }
const errorStyle: React.CSSProperties = { fontSize: 11, color: 'var(--red)', marginTop: 3 }
