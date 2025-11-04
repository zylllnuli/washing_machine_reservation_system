import { defineStore } from 'pinia'

export interface UserProfile {
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
	try { const raw = localStorage.getItem('laundry_user'); return raw ? JSON.parse(raw) : null } catch { return null }
}
function saveUser(user: UserProfile | null) {
	if (user) localStorage.setItem('laundry_user', JSON.stringify(user))
	else localStorage.removeItem('laundry_user')
}

export const useAuthStore = defineStore('auth', {
	state: () => ({
		user: loadUser() as UserProfile | null,
		token: loadToken()
	}),
	getters: {
		isAuthed: (state) => !!state.user && !!state.token,
		isAdmin: (state) => state.user?.role === 'admin'
	},
	actions: {
		setSession(token: string, user: UserProfile) {
			this.token = token
			this.user = user
			saveToken(token)
			saveUser(user)
		},
		logout() {
			this.token = ''
			this.user = null
			saveToken('')
			saveUser(null)
		}
	}
})
