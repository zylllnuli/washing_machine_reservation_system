import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api'

type Machine = {
  id: number
  name: string
  building: string
  floor?: string
  location: string
  status: 'idle' | 'busy'
  guide?: string
}

type Slot = { id: number; start: string; end: string; available: boolean }

export default function MachineDetail() {
  const { id } = useParams()
  const machineId = Number(id)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    api.getMachines().then((ms: Machine[]) => setMachine(ms.find(m => m.id === machineId) || null))
    api.getSlots(machineId).then(setSlots)
  }, [machineId])

  if (!machine) return <p>加载中...</p>

  return (
    <div>
      <h2>{machine.name}</h2>
      <p>{machine.building} {machine.floor} | {machine.location}</p>
      {machine.guide && <p>使用指南：{machine.guide}</p>}
      <h3>今日时段</h3>
      <ul>
        {slots.map(s => (
          <li key={s.id}>
            {s.start}-{s.end} {s.available ? <Link to={`/booking/${machineId}?slotId=${s.id}`}>预约</Link> : <span style={{ color: '#999' }}>不可用</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}


