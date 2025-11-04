import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'

type Reservation = {
  id: number
  machineId: number
  machineName: string
  date: string
  start: string
  end: string
  status: 'pending' | 'ongoing' | 'completed'
}

export default function MyReservations() {
  const [list, setList] = useState<Reservation[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState<Record<number, string>>({})
  const timerRef = useRef<any>()

  async function load() {
    try {
      setLoading(true)
      const rows = await api.getMyReservations() as Reservation[]
      setList(rows)
      updateCountdowns(rows)
    } catch (e: any) {
      setErr(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(() => updateCountdowns(), 60_000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function updateCountdowns(rows?: Reservation[]) {
    const now = new Date()
    const src = rows || list
    const map: Record<number, string> = {}
    for (const r of src) {
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
    setCountdown(map)
  }

  async function cancel(id: number) {
    await api.cancelReservation(id)
    load()
  }

  return (
    <section>
      <h2>我的预约</h2>
      {err && <p className="err">{err}</p>}
      {loading ? <p>加载中...</p> : list.length === 0 ? <p>暂无预约</p> : (
        <ul className="list">
          {list.map(r => (
            <li key={r.id} className="item">
              <div className="info">
                <div className="title">{r.machineName}</div>
                <small>{r.date} {r.start} - {r.end}</small>
                {r.status === 'pending' && countdown[r.id] && <small>{countdown[r.id]}</small>}
              </div>
              <span className={`badge ${r.status}`}>{r.status === 'pending' ? '待开始' : r.status === 'ongoing' ? '进行中' : '已完成'}</span>
              <div className="actions">
                <button className="danger" onClick={() => cancel(r.id)}>取消</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}


