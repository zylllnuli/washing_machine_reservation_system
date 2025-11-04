<template>
	<section>
		<h2>我的预约</h2>
		<p v-if="error" class="err">{{ error }}</p>
		<p v-else-if="loading">加载中...</p>
		<p v-else-if="!reservations.length">暂无预约</p>
		<ul v-else class="list">
			<li v-for="r in reservations" :key="r.id" class="item">
				<div class="info">
					<div class="title">{{ r.machineName }}</div>
					<small>{{ r.date }} {{ r.start }} - {{ r.end }}</small>
					<small v-if="r.status==='pending' && countdown[r.id]">{{ countdown[r.id] }}</small>
				</div>
				<span class="badge" :class="r.status">{{ statusText(r.status) }}</span>
				<div class="actions">
					<button @click="cancel(r.id)" class="danger">取消</button>
					<button v-if="r.status==='pending'" @click="toggleReschedule(r.id)">改期</button>
				</div>
			</li>
		</ul>
		<div v-if="selectedReservation" class="panel">
			<div class="row">
				<input type="date" v-model="resDate" />
				<select v-model="resSlotId">
					<option v-for="s in resSlots" :key="s.id" :value="s.id" :disabled="!s.available">{{ s.start }}-{{ s.end }} {{ s.available ? '' : '(已满)' }}</option>
				</select>
				<button class="primary" :disabled="!resSlotId" @click="confirmReschedule(selectedReservation.id, selectedReservation.machineId)">提交</button>
				<button @click="toggleReschedule(0)">取消</button>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { api } from '../services/api'

interface Reservation { id: number; machineId: number; machineName: string; date: string; start: string; end: string; status?: 'pending' | 'ongoing' | 'completed' }
interface Slot { id: number; start: string; end: string; available: boolean }

const reservations = ref<Reservation[]>([])
const loading = ref(false)
const error = ref('')
let timer: any
const countdown = ref<Record<number, string>>({})

async function load() {
	loading.value = true
	error.value = ''
	try {
		const list = await api.getMyReservations()
		reservations.value = Array.isArray(list) ? list : []
		updateCountdowns()
	} catch (e: any) {
		error.value = e?.message || '加载失败'
	} finally {
		loading.value = false
	}
}

function updateCountdowns() {
	const now = new Date()
	const map: Record<number, string> = {}
	for (const r of reservations.value) {
		if (r.status !== 'pending') continue
		const [y, m, d] = r.date.split('-').map(Number)
		const h = Number(r.start.split(':')[0])
		const start = new Date(y, m - 1, d, h, 0, 0, 0)
		const diff = start.getTime() - now.getTime()
		if (diff > 0) {
			const hh = Math.floor(diff / 3600000)
			const mm = Math.floor((diff % 3600000) / 60000)
			map[r.id] = `倒计时 ${hh}小时${mm}分钟`
		}
	}
	countdown.value = map
}

onMounted(async () => {
	await load()
	timer = setInterval(() => { updateCountdowns() }, 60_000)
})

onUnmounted(() => { if (timer) clearInterval(timer) })

async function cancel(id: number) {
	try {
		await api.cancelReservation(id)
		await load()
	} catch (e: any) {
		alert(e?.message || '取消失败')
	}
}

function statusText(s?: string) {
	if (s === 'pending') return '待开始'
	if (s === 'ongoing') return '进行中'
	if (s === 'completed') return '已完成'
	return '—'
}

const reschedulingId = ref(0)
const resDate = ref<string>(new Date().toISOString().slice(0, 10))
const resSlots = ref<Slot[]>([])
const resSlotId = ref<number | null>(null)

const selectedReservation = computed(() => reservations.value.find(x => x.id === reschedulingId.value) || null)

function toggleReschedule(id: number) {
	reschedulingId.value = id
	resSlotId.value = null
	if (id) loadSlotsFor(id)
}

async function loadSlotsFor(id: number) {
	const r = reservations.value.find(x => x.id === id)
	if (!r) return
	resDate.value = r.date
	try {
		resSlots.value = await api.getSlots(r.machineId, resDate.value)
	} catch (e: any) {
		alert(e?.message || '加载时段失败')
	}
}

watch(resDate, async () => {
	if (reschedulingId.value) await loadSlotsFor(reschedulingId.value)
})

async function confirmReschedule(id: number, machineId: number) {
	if (!resSlotId.value) return
	try {
		await api.reschedule(id, { date: resDate.value, slotId: resSlotId.value })
		reschedulingId.value = 0
		await load()
		alert('改期成功')
	} catch (e: any) {
		alert(e?.message || '改期失败')
	}
}
</script>

<style scoped>
.err { color: #ef4444; }
.list { list-style: none; padding: 0; }
.item { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; padding: 10px; background: #fff; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.info .title { font-weight: 600; }
.badge { padding: 4px 8px; border-radius: 999px; background: #eee; font-size: 12px; }
.badge.pending { background: #fde68a; }
.badge.ongoing { background: #86efac; }
.badge.completed { background: #cbd5e1; }
.danger { background: #ef4444; color: #fff; border: 0; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.panel { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 8px; margin-bottom: 10px; }
.row { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; }
@media (max-width: 600px) {
	.item { grid-template-columns: 1fr auto; }
	.danger { grid-column: 1 / -1; justify-self: end; }
	.row { grid-template-columns: 1fr; }
}
</style>
