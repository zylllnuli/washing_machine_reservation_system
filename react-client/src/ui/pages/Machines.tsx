import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api'
import { useFavoritesStore } from '../../stores/favorites'

type Machine = {
  id: number
  name: string
  building: string
  floor?: string
  location: string
  status: 'idle' | 'busy'
  guide?: string
}

export default function Machines() {
  const [list, setList] = useState<Machine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [buildings, setBuildings] = useState<string[]>([])
  const [floors, setFloors] = useState<string[]>([])
  const [onlyFav, setOnlyFav] = useState(false)
  const [onlyIdle, setOnlyIdle] = useState(false)
  const fav = useFavoritesStore()

  useEffect(() => {
    setLoading(true)
    setError('')
    api.getMachines().then((ms: Machine[]) => {
      setList(ms)
      const bset = new Set<string>()
      const fset = new Set<string>()
      for (const m of ms) { if (m.building) bset.add(m.building); if (m.floor) fset.add(m.floor) }
      setBuildings(Array.from(bset))
      setFloors(Array.from(fset))
    }).catch((e: any) => setError(e?.message || '加载失败')).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return list.filter(m => {
      const matchQ = (m.name + m.location).toLowerCase().includes(q.toLowerCase())
      const matchB = !building || m.building === building
      const matchF = !floor || m.floor === floor
      const matchFav = !onlyFav || fav.isFav(m.id)
      const matchIdle = !onlyIdle || m.status === 'idle'
      return matchQ && matchB && matchF && matchFav && matchIdle
    })
  }, [list, q, building, floor, onlyFav, onlyIdle, fav])

  return (
    <section>
      <h2>洗衣机列表</h2>
      <div className="toolbar">
        <input placeholder="搜索名称/位置" value={q} onChange={e => setQ(e.target.value)} />
        <select value={building} onChange={e => setBuilding(e.target.value)}>
          <option value="">全部楼栋</option>
          {buildings.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={floor} onChange={e => setFloor(e.target.value)}>
          <option value="">全部楼层</option>
          {floors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="fav-only"><input type="checkbox" checked={onlyFav} onChange={e => setOnlyFav(e.target.checked)} /> 只看收藏</label>
        <label className="fav-only"><input type="checkbox" checked={onlyIdle} onChange={e => setOnlyIdle(e.target.checked)} /> 只看空闲</label>
      </div>
      {error && <p className="err">{error}</p>}
      {loading ? <p>加载中...</p> : (
        <div className="grid">
          {filtered.map(m => (
            <article key={m.id} className="card">
              <h3>
                <Link to={`/machines/${m.id}`}>{m.name}</Link>
                <button className={`fav ${fav.isFav(m.id) ? 'active' : ''}`} onClick={() => fav.toggle(m.id)}>★</button>
              </h3>
              <p>位置：{m.location}（{m.building || '未知'} {m.floor || ''}） · 状态：<strong className={m.status==='idle' ? 'ok' : 'busy'}>{m.status==='idle' ? '空闲' : '使用中'}</strong></p>
              <Link to={`/booking/${m.id}`} className="btn-green">预约</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}


