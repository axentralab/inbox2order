import { create } from 'zustand'
import { User } from '@/types'
import api from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  setUser: (user: User, token: string) => void
  logout: () => void
  initFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setUser: (user, token) => {
    localStorage.setItem('i2o_token', token)
    localStorage.setItem('i2o_user', JSON.stringify(user))
    set({ user, token, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('i2o_token')
    localStorage.removeItem('i2o_user')
    set({ user: null, token: null, isLoading: false })
    window.location.href = '/auth/login'
  },

  initFromStorage: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('i2o_token')
    const userStr = localStorage.getItem('i2o_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, token, isLoading: false })
      } catch {
        set({ isLoading: false })
      }
    } else {
      set({ isLoading: false })
    }
  },
}))
