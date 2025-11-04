<template>
	<section>
		<h2>预约时间</h2>
		<div class="row">
			<label>
				<span>日期</span>
				<input type="date" v-model="date" @change="onDateChange" />
			</label>
		</div>
		<p v-if="loading">加载时段中...</p>
		<p v-if="error" class="err">{{ error }}</p>
		<ul v-if="!loading" class="slots">
			<li v-for="s in slots" :key="s.id">
				<label>
					<input type="radio" name="slot" :value="s.id" v-model="selectedSlotId" :disabled="!s.available" />
					{{ s.start }} - {{ s.end }}
					<span v-if="!s.available" class="full">已满</span>
				</label>
			</li>
		</ul>
		<button class="primary" :disabled="!selectedSlotId || booking" @click="book">{{ booking ? '提交中...' : '确认预约' }}</button>
	</section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const machineId = Number(route.params.machineId)

interface Slot { id: number; start: string; end: string; available: boolean }
const slots = ref<Slot[]>([])
const selectedSlotId = ref<number | null>(null)
const loading = ref(false)
const error = ref('')
const booking = ref(false)
const date = ref<string>(new Date().toISOString().slice(0, 10))
let rolledOnce = false

function isToday(iso: string) {
	const now = new Date()
	const d = new Date(iso)
	return now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate()
}

async function loadSlots() {
	loading.value = true
	error.value = ''
	try {
		slots.value = await api.getSlots(machineId, date.value)
		// if today and none available, auto roll to next day once
		if (!rolledOnce && isToday(date.value) && slots.value.every(s => !s.available)) {
			const next = new Date(date.value)
			next.setDate(next.getDate() + 1)
			date.value = next.toISOString().slice(0, 10)
			rolledOnce = true
			await loadSlots()
			alert('今日已无可预约时段，已切换到明天')
			return
		}
	} catch (e: any) {
		error.value = e?.message || '加载失败'
	} finally {
		loading.value = false
	}
}

function onDateChange() {
	selectedSlotId.value = null
	rolledOnce = false
	loadSlots()
}

onMounted(() => {
	const qd = route.query.date as string | undefined
	if (qd) date.value = qd
	loadSlots()
})

watch(() => route.query.date, (val) => {
	if (typeof val === 'string' && val) {
		date.value = val
		onDateChange()
	}
})

async function book() {
	if (!selectedSlotId.value) return
	booking.value = true
	try {
		await api.createReservation({ machineId, slotId: selectedSlotId.value, date: date.value })
		alert('预约成功')
		router.push({ name: 'my' })
	} catch (e: any) {
		alert(e?.message || '提交失败')
	} finally {
		booking.value = false
	}
}
</script>

<style scoped>
.row { display: flex; gap: 8px; margin-bottom: 10px; }
.slots { list-style: none; padding: 0; }
.slots li { margin-bottom: 8px; }
.full { color: #ef4444; margin-left: 8px; }
.primary { margin-top: 12px; background: #2563eb; color: white; padding: 8px 12px; border: 0; border-radius: 6px; cursor: pointer; }
.err { color: #ef4444; }
</style>
