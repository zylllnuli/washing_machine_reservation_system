import { create } from 'zustand'

export type UserProfile = {
  id: number
  name: string
  role: 'user' | 'admin'
  building?: string
}

function loadToken() {
  return localStorage.getItem('laundry_token') || ''
}
function saveToken(token: string) {
  if (token) localStorage.setItem('laundry_token', token)
  else localStorage.removeItem('laundry_token')
}
function loadUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('laundry_user')
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}
function saveUser(user: UserProfile | null) {
  if (user) localStorage.setItem('laundry_user', JSON.stringify(user))
  else localStorage.removeItem('laundry_user')
}

type AuthState = {
  user: UserProfile | null
  token: string
  isAuthed: boolean
  isAdmin: boolean
  setSession: (token: string, user: UserProfile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadUser(),
  token: loadToken(),
  get isAuthed() {
    const s = get()
    return !!s.user && !!s.token
  },
  get isAdmin() {
    return get().user?.role === 'admin'
  },
  setSession(token, user) {
    saveToken(token)
    saveUser(user)
    set({ token, user })
  },
  logout() {
    saveToken('')
    saveUser(null)
    set({ token: '', user: null })
  }
}))


