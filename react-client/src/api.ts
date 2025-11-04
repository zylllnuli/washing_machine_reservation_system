const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getAuthHeaders() {
  try {
    const raw = localStorage.getItem('laundry_token')
    if (!raw) return {}
    return { Authorization: `Bearer ${raw}` }
  } catch {
    return {}
  }
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
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    ...options
  })
  if (!res.ok) {
    const status = res.status
    const raw = await res.text()
    let message: string = raw || `${status}`
    try { const data = JSON.parse(raw); message = (data as any)?.message || message } catch {}
    if (status === 401) {
      redirectToLogin()
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  login(payload: { username: string; password: string }) {
    return request('/login', { method: 'POST', body: JSON.stringify(payload) })
  },
  getMachines() {
    return request('/machines')
  },
  getSlots(machineId: number, date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : ''
    return request(`/machines/${machineId}/slots${q}`)
  },
  createReservation(payload: { machineId: number; slotId: number; date?: string }) {
    return request('/reservations', { method: 'POST', body: JSON.stringify(payload) })
  },
  getMyReservations(userId?: number) {
    const q = userId ? `?userId=${userId}` : ''
    return request(`/reservations${q}`)
  },
  cancelReservation(id: number) {
    return request(`/reservations/${id}`, { method: 'DELETE' })
  },
  reschedule(id: number, payload: { date: string; slotId: number }) {
    return request(`/reservations/${id}/reschedule`, { method: 'POST', body: JSON.stringify(payload) })
  },
  // Admin
  addMachine(payload: { name: string; location: string; status?: 'idle' | 'busy'; building?: string; floor?: string; guide?: string }) {
    return request('/machines', { method: 'POST', body: JSON.stringify(payload) })
  },
  removeMachine(id: number) {
    return request(`/machines/${id}`, { method: 'DELETE' })
  },
  releaseSlots(machineId: number, slotId?: number, date?: string) {
    return request(`/machines/${machineId}/release`, { method: 'POST', body: JSON.stringify({ slotId, date }) })
  },
  exportCsv(date?: string, building?: string) {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (building) params.set('building', building)
    const url = `${BASE_URL}/export/reservations.csv?${params.toString()}`
    return fetch(url, { headers: { ...getAuthHeaders() } }).then(async (res) => {
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `${res.status}`)
      }
      return res.blob()
    })
  },
  getAdminStats(date?: string) {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    return request(`/admin/stats?${params.toString()}`)
  },
  getBlacklist() {
    return request('/admin/blacklist')
  },
  updateBlacklist(payload: { userId: number; bannedUntil: string | null }) {
    return request('/admin/blacklist', { method: 'POST', body: JSON.stringify(payload) })
  },
  seedDemo(payload?: { buildings?: string[]; floorsPerBuilding?: number; machinesPerFloor?: number }) {
    return request('/admin/seed-demo', { method: 'POST', body: JSON.stringify(payload || {}) })
  },
  normalizeBuildings() {
    return request('/admin/normalize-buildings', { method: 'POST' })
  }
}


