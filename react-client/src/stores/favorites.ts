import { create } from 'zustand'

const STORAGE_KEY = 'laundry_favorites'

function loadSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set<number>()
    return new Set<number>(JSON.parse(raw) as number[])
  } catch {
    return new Set<number>()
  }
}

function saveSet(set: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
}

type FavoritesState = {
  ids: Set<number>
  isFav: (id: number) => boolean
  toggle: (id: number) => void
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: loadSet(),
  isFav: (id: number) => get().ids.has(id),
  toggle: (id: number) => {
    const next = new Set(get().ids)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    saveSet(next)
    set({ ids: next })
  }
}))


