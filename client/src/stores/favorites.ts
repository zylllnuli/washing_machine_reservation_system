import { defineStore } from 'pinia'

const STORAGE_KEY = 'laundry_favorites'

function loadSet() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return new Set<number>()
		return new Set<number>(JSON.parse(raw))
	} catch {
		return new Set<number>()
	}
}

function saveSet(set: Set<number>) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
}

export const useFavoritesStore = defineStore('favorites', {
	state: () => ({
		ids: loadSet()
	}),
	getters: {
		isFav: (state) => (id: number) => state.ids.has(id)
	},
	actions: {
		toggle(id: number) {
			if (this.ids.has(id)) this.ids.delete(id)
			else this.ids.add(id)
			saveSet(this.ids)
		}
	}
})
