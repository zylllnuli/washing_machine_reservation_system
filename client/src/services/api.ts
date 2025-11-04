const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function authHeaders() {
	try {
		const raw = localStorage.getItem('laundry_token')
		if (!raw) return {}
		return { Authorization: `Bearer ${raw}` }
	} catch { return {} }
}

function redirectToLogin() {
	try {
		localStorage.removeItem('laundry_token')
		localStorage.removeItem('laundry_user')
		const current = window.location.pathname + window.location.search
		if (!window.location.pathname.startsWith('/login')) {
			window.location.assign(`/login?redirect=${encodeURIComponent(current)}`)
		}
	} catch {}
}

async function request(path: string, options?: RequestInit) {
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		...options
	})
	if (!res.ok) {
		const status = res.status
		const raw = await res.text()
		let message = raw || `${status}`
		try { const data = JSON.parse(raw); message = data?.message || message } catch {}
		if (status === 401) {
			redirectToLogin()
		}
		throw new Error(message)
	}
	if (res.status === 204) return null
	return res.json()
}

export const api = {
	async login(payload: { username: string; password: string }) {
		return request('/login', { method: 'POST', body: JSON.stringify(payload) })
	},
	async getMachines() {
		return request('/machines')
	},
	async getSlots(machineId: number, date?: string) {
		const q = date ? `?date=${encodeURIComponent(date)}` : ''
		return request(`/machines/${machineId}/slots${q}`)
	},
	async createReservation(payload: { machineId: number; slotId: number; date?: string }) {
		return request('/reservations', { method: 'POST', body: JSON.stringify(payload) })
	},
	async getMyReservations(userId?: number) {
		const q = userId ? `?userId=${userId}` : ''
		return request(`/reservations${q}`)
	},
	async cancelReservation(id: number) {
		return request(`/reservations/${id}`, { method: 'DELETE' })
	},
	async reschedule(id: number, payload: { date: string; slotId: number }) {
		return request(`/reservations/${id}/reschedule`, { method: 'POST', body: JSON.stringify(payload) })
	},
	// Admin
	async addMachine(payload: { name: string; location: string; status?: 'idle' | 'busy'; building?: string }) {
		return request('/machines', { method: 'POST', body: JSON.stringify(payload) })
	},
	async removeMachine(id: number) {
		return request(`/machines/${id}`, { method: 'DELETE' })
	},
	async releaseSlots(machineId: number, slotId?: number, date?: string) {
		return request(`/machines/${machineId}/release`, { method: 'POST', body: JSON.stringify({ slotId, date }) })
	},
	async exportCsv(date?: string, building?: string) {
		const params = new URLSearchParams()
		if (date) params.set('date', date)
		if (building) params.set('building', building)
		const url = `${BASE_URL}/export/reservations.csv?${params.toString()}`
		const res = await fetch(url, { headers: { ...authHeaders() } })
		if (!res.ok) {
			const text = await res.text()
			throw new Error(text || `${res.status}`)
		}
		return res.blob()
	}
}
