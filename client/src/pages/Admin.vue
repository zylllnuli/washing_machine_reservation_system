<template>
	<section>
		<h2>管理端</h2>
		<div class="add-card">
			<h3>新增机器</h3>
			<div class="add-grid12">
				<div class="field span-4">
					<label>名称</label>
					<input v-model="name" placeholder="例如 A区-03号" />
				</div>
				<div class="field span-4">
					<label>位置</label>
					<input v-model="location" placeholder="例如 宿舍A楼1层" />
				</div>
				<div class="field span-2">
					<label>楼栋</label>
					<input v-model="building" placeholder="例如 A区" />
				</div>
				<div class="field span-2">
					<label>楼层</label>
					<input v-model="floor" placeholder="例如 3层" />
				</div>
				<div class="field span-8">
					<label>使用指引（可选）</label>
					<input v-model="guide" placeholder="例如 使用完清理滤网" />
				</div>
				<div class="actions span-4">
					<button class="primary" :disabled="!name || !location || loading" @click="add">{{ loading ? '提交中...' : '新增机器' }}</button>
				</div>
			</div>
		</div>
		<div class="export">
			<div class="controls">
				<label class="toggle"><input type="checkbox" v-model="exportAll" /> 导出全部</label>
				<label class="toggle"><input type="checkbox" v-model="useRange" :disabled="exportAll" /> 按日期范围</label>
				<div v-if="!useRange" class="grp">
					<label>日期</label>
					<input type="date" v-model="exportDate" :disabled="exportAll" />
				</div>
				<div v-else class="grp">
					<label>开始</label>
					<input type="date" v-model="start" :disabled="exportAll" />
					<label>结束</label>
					<input type="date" v-model="end" :disabled="exportAll" />
				</div>
				<div class="grp">
					<label>楼栋</label>
					<select v-model="exportBuilding">
						<option value="">全部</option>
						<option v-for="b in buildingOptions" :key="b" :value="b">{{ b }}</option>
					</select>
				</div>
				<button @click="exportCsv">导出预约CSV</button>
			</div>
		</div>
		<p v-if="error" class="err">{{ error }}</p>
		<table class="table">
			<thead>
				<tr>
					<th>ID</th>
					<th>名称</th>
					<th>位置</th>
					<th>楼栋</th>
					<th>楼层</th>
					<th>操作</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="m in machines" :key="m.id">
					<td>{{ m.id }}</td>
					<td>{{ m.name }}</td>
					<td>{{ m.location }}</td>
					<td>{{ m.building }}</td>
					<td>{{ m.floor }}</td>
					<td>
						<button @click="releaseAll(m.id)">释放全部时段</button>
						<button class="danger" @click="remove(m.id)">下线</button>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../services/api'

interface Machine { id: number; name: string; location: string; building?: string; floor?: string }
const machines = ref<Machine[]>([])
const name = ref('')
const location = ref('')
const building = ref('')
const floor = ref('')
const guide = ref('')
const loading = ref(false)
const error = ref('')

const exportDate = ref<string>(new Date().toISOString().slice(0, 10))
const start = ref<string>('')
const end = ref<string>('')
const useRange = ref(false)
const exportAll = ref(false)
const exportBuilding = ref('')
const buildingOptions = ref<string[]>([])

async function load() {
	try {
		machines.value = await api.getMachines()
		buildingOptions.value = Array.from(new Set(machines.value.map(m => m.building).filter(Boolean))) as string[]
	} catch (e: any) {
		error.value = e?.message || '加载失败'
	}
}

onMounted(load)

async function add() {
	loading.value = true
	error.value = ''
	try {
		await api.addMachine({ name: name.value, location: location.value, building: building.value, status: 'idle' })
		name.value = ''
		location.value = ''
		building.value = ''
		floor.value = ''
		guide.value = ''
		await load()
	} catch (e: any) {
		error.value = e?.message || '新增失败'
	} finally {
		loading.value = false
	}
}

async function remove(id: number) {
	try {
		await api.removeMachine(id)
		await load()
	} catch (e: any) {
		alert(e?.message || '下线失败')
	}
}

async function releaseAll(id: number) {
	try {
		await api.releaseSlots(id)
		alert('已释放所有时段')
	} catch (e: any) {
		alert(e?.message || '释放失败')
	}
}

async function exportCsv() {
	try {
		if (exportAll.value) {
			const params = new URLSearchParams()
			if (exportBuilding.value) params.set('building', exportBuilding.value)
			const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/export/reservations.csv?${params.toString()}`
			const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('laundry_token')}` } })
			if (!res.ok) throw new Error(await res.text())
			const blob = await res.blob()
			downloadBlob(blob, 'reservations-all.csv')
			return
		}
		if (useRange.value) {
			const params = new URLSearchParams()
			if (start.value) params.set('start', start.value)
			if (end.value) params.set('end', end.value)
			if (exportBuilding.value) params.set('building', exportBuilding.value)
			const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/export/reservations.csv?${params.toString()}`
			const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('laundry_token')}` } })
			if (!res.ok) throw new Error(await res.text())
			const blob = await res.blob()
			downloadBlob(blob, `reservations-${start.value || 'all'}${end.value ? `_to_${end.value}` : ''}.csv`)
			return
		}
		const blob = await api.exportCsv(exportDate.value, exportBuilding.value || undefined)
		downloadBlob(blob, `reservations-${exportDate.value || 'all'}.csv`)
	} catch (e: any) {
		alert(e?.message || '导出失败')
	}
}

function downloadBlob(blob: Blob, filename: string) {
	const a = document.createElement('a')
	const url = URL.createObjectURL(blob)
	const pad = (n: number) => String(n).padStart(2, '0')
	const now = new Date()
	const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
	const finalName = filename.endsWith('.csv') ? filename.replace(/\.csv$/i, `_${ts}.csv`) : `${filename}_${ts}`
	a.href = url
	a.download = finalName
	document.body.appendChild(a)
	a.click()
	URL.revokeObjectURL(url)
	document.body.removeChild(a)
}
</script>

<style scoped>
.err { color: #ef4444; }
.add-card { background: #fff; border: 1px solid #e6eaf0; border-radius: 12px; padding: 14px; margin: 8px 0 12px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.add-card h3 { margin: 0 0 10px 0; font-size: 16px; color: #0f172a; }
.add-grid12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; align-items: end; }
.span-2 { grid-column: span 2; }
.span-4 { grid-column: span 4; }
.span-8 { grid-column: span 8; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; color: #6b7280; }
.actions { display: flex; justify-content: flex-end; }
.export { background: #fff; border: 1px solid #e6eaf0; border-radius: 10px; padding: 10px; margin: 8px 0 12px; }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.grp { display: flex; align-items: center; gap: 6px; }
.toggle { display: flex; align-items: center; gap: 6px; margin-right: 8px; }
input, select { padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; background: #fff; }
.primary { background: #2563eb; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eef2f7; }
button { padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; background: #f8fafc; cursor: pointer; margin-right: 6px; }
.danger { background: #ef4444; color: #fff; border: 0; }
@media (max-width: 1100px) { .span-4 { grid-column: span 6; } .span-2 { grid-column: span 3; } .span-8 { grid-column: span 12; } .actions.span-4 { grid-column: span 12; } }
@media (max-width: 640px) { .span-4, .span-2, .span-8 { grid-column: span 12; } .controls { flex-direction: column; align-items: flex-start; } }
</style>
