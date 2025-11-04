import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api'

type Slot = { id: number; start: string; end: string; available: boolean }

export default function Booking() {
  const { machineId } = useParams()
  const mId = Number(machineId)
  const [params] = useSearchParams()
  const preSlotId = Number(params.get('slotId') || '')
  const [date, setDate] = useState<string>('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<number | null>(preSlotId || null)
  const [err, setErr] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const t = `${y}-${m}-${d}`
    setDate(t)
  }, [])

  useEffect(() => {
    if (!mId || !date) return
    let rolledOnce = false
    async function load() {
      setLoading(true)
      setErr('')
      try {
        const s = await api.getSlots(mId, date)
        // if today and none available, auto roll to next day once (match Vue behavior)
        const today = new Date().toISOString().slice(0, 10)
        if (!rolledOnce && date === today && s.every((x: any) => !x.available)) {
          const next = new Date(date)
          next.setDate(next.getDate() + 1)
          const nextStr = next.toISOString().slice(0, 10)
          setDate(nextStr)
          rolledOnce = true
          const s2 = await api.getSlots(mId, nextStr)
          setSlots(s2)
          alert('今日已无可预约时段，已切换到明天')
        } else {
          setSlots(s)
        }
      } catch (e: any) {
        setErr(e?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mId, date])

  async function submit() {
    setErr('')
    try {
      if (!selected) throw new Error('请选择时段')
      setBooking(true)
      await api.createReservation({ machineId: mId, slotId: selected, date })
      navigate('/my')
    } catch (e: any) {
      setErr(e.message || '预约失败')
    } finally {
      setBooking(false)
    }
  }

  const daySlots = useMemo(() => slots, [slots])

  return (
    <div>
      <h2>预约</h2>
      <div className="row">
        <label>
          <span>日期</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
      </div>
      {loading && <p>加载时段中...</p>}
      {err && <p className="err">{err}</p>}
      {!loading && (
        <ul className="slots">
          {daySlots.map(s => (
            <li key={s.id}>
              <label>
                <input type="radio" name="slot" disabled={!s.available} checked={selected === s.id} onChange={() => setSelected(s.id)} />
                {s.start} - {s.end}
                {!s.available && <span className="full">已满</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
      <button className="primary" disabled={!selected || booking} onClick={submit}>{booking ? '提交中...' : '确认预约'}</button>
    </div>
  )
}


