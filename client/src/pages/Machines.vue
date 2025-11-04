<template>
	<section>
		<h2>洗衣机列表</h2>
		<div class="toolbar">
			<input v-model="q" placeholder="搜索名称/位置" />
			<select v-model="building">
				<option value="">全部楼栋</option>
				<option v-for="b in buildings" :key="b" :value="b">{{ b }}</option>
			</select>
			<select v-model="floor">
				<option value="">全部楼层</option>
				<option v-for="f in floors" :key="f" :value="f">{{ f }}</option>
			</select>
			<label class="fav-only"><input type="checkbox" v-model="onlyFav" /> 只看收藏</label>
			<label class="fav-only"><input type="checkbox" v-model="onlyIdle" /> 只看空闲</label>
		</div>
		<p v-if="error" class="err">{{ error }}</p>
		<p v-else-if="loading">加载中...</p>
		<div v-else class="grid">
			<article v-for="m in filtered" :key="m.id" class="card">
				<h3>
					<router-link :to="{ name: 'machine-detail', params: { id: m.id } }">{{ m.name }}</router-link>
					<button class="fav" :class="{ active: fav.isFav(m.id) }" @click="fav.toggle(m.id)">★</button>
				</h3>
				<p>位置：{{ m.location }}（{{ m.building || '未知' }} {{ m.floor || '' }}） · 状态：<strong :class="{ ok: m.status==='idle', busy: m.status!=='idle' }">{{ m.status==='idle' ? '空闲' : '使用中' }}</strong></p>
				<router-link :to="{ name: 'booking', params: { machineId: m.id } }" class="btn">预约</router-link>
			</article>
		</div>
	</section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { api } from '../services/api'
import { useFavoritesStore } from '../stores/favorites'

interface Machine { id: number; name: string; location: string; status: 'idle' | 'busy'; building?: string; floor?: string }

const machines = ref<Machine[]>([])
const q = ref('')
const building = ref('')
const floor = ref('')
const buildings = ref<string[]>([])
const floors = ref<string[]>([])
const onlyFav = ref(false)
const onlyIdle = ref(false)
const fav = useFavoritesStore()
const loading = ref(false)
const error = ref('')

async function load() {
	loading.value = true
	error.value = ''
	try {
		machines.value = await api.getMachines()
		const bset = new Set<string>()
		const fset = new Set<string>()
		for (const m of machines.value) { if (m.building) bset.add(m.building); if (m.floor) fset.add(m.floor) }
		buildings.value = Array.from(bset)
		floors.value = Array.from(fset)
	} catch (e: any) {
		error.value = e?.message || '加载失败'
	} finally {
		loading.value = false
	}
}

onMounted(load)

const filtered = computed(() => {
	return machines.value.filter(m => {
		const matchQ = (m.name + m.location).toLowerCase().includes(q.value.toLowerCase())
		const matchB = !building.value || m.building === building.value
		const matchF = !floor.value || m.floor === floor.value
		const matchFav = !onlyFav.value || fav.isFav(m.id)
		const matchIdle = !onlyIdle.value || m.status === 'idle'
		return matchQ && matchB && matchF && matchFav && matchIdle
	})
})
</script>

<style scoped>
.err { color: #ef4444; }
.toolbar { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto auto; gap: 12px; align-items: center; margin: 8px 0 12px; }
.toolbar input, .toolbar select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; }
.fav-only { display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 14px; color: #333; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card h3 { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px 0; }
.fav { border: 1px solid #ddd; background: #fff; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.fav.active { background: #fde68a; }
.btn { display: inline-block; margin-top: 8px; background: #16a34a; color: #fff; padding: 8px 12px; border-radius: 6px; text-decoration: none; }
.ok { color: #16a34a; } .busy { color: #ef4444; }
@media (max-width: 900px) { .toolbar { grid-template-columns: 1fr 1fr; grid-auto-rows: auto; } }
@media (max-width: 600px) { .toolbar { grid-template-columns: 1fr; } }
</style>
