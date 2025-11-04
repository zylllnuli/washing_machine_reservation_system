<template>
	<section>
		<h2 v-if="machine">{{ machine.name }} 详情</h2>
		<p v-if="error" class="err">{{ error }}</p>
		<p v-else-if="loading">加载中...</p>
		<div v-else>
			<div v-if="machine" class="card">
				<p>位置：{{ machine.location }}</p>
				<p>楼栋/楼层：{{ machine.building || '未知' }} {{ machine.floor || '' }}</p>
				<p>当前状态：<strong :class="{ ok: machine.status==='idle', busy: machine.status!=='idle' }">{{ machine.status==='idle' ? '空闲' : '使用中' }}</strong></p>
			</div>
			<div v-if="machine?.guide" class="card">
				<h4>使用指引</h4>
				<p>{{ machine!.guide }}</p>
			</div>
			<div class="row">
				<label>
					<span>日期</span>
					<input type="date" v-model="date" @change="load" />
				</label>
			</div>
			<h3>时段</h3>
			<ul class="slots">
				<li v-for="s in slots" :key="s.id">
					<span>{{ s.start }} - {{ s.end }}</span>
					<span v-if="!s.available" class="full">已满</span>
					<router-link v-else :to="{ name: 'booking', params: { machineId: machine!.id }, query: { date } }" class="mini">预约</router-link>
				</li>
			</ul>
		</div>
	</section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const id = Number(route.params.id)

interface Machine { id: number; name: string; location: string; status: 'idle' | 'busy'; building?: string; floor?: string; guide?: string }
interface Slot { id: number; start: string; end: string; available: boolean }

const machine = ref<Machine | null>(null)
const slots = ref<Slot[]>([])
const date = ref<string>(new Date().toISOString().slice(0, 10))
const loading = ref(false)
const error = ref('')

async function load() {
	loading.value = true
	error.value = ''
	try {
		const list = await api.getMachines()
		machine.value = list.find(m => m.id === id) || null
		slots.value = await api.getSlots(id, date.value)
	} catch (e: any) {
		error.value = e?.message || '加载失败'
	} finally {
		loading.value = false
	}
}

onMounted(load)
</script>

<style scoped>
.err { color: #ef4444; }
.card { background: #fff; padding: 12px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 10px; }
.row { margin: 10px 0; }
.slots { list-style: none; padding: 0; }
.slots li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #eee; }
.full { color: #ef4444; }
.mini { background: #16a34a; color: #fff; text-decoration: none; padding: 4px 8px; border-radius: 6px; }
.ok { color: #16a34a; } .busy { color: #ef4444; }
</style>
