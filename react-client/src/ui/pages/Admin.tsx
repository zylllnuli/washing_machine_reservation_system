import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function Admin() {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [guide, setGuide] = useState('')
  const [machines, setMachines] = useState<any[]>([])
  const [buildingOptions, setBuildingOptions] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [stats, setStats] = useState<any | null>(null)
  const [black, setBlack] = useState<any[]>([])
  const [exportBuilding, setExportBuilding] = useState('')
  const [exportAll, setExportAll] = useState(false)
  const [useRange, setUseRange] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')

  async function loadAll() {
    const ms = await api.getMachines() as any[]
    setMachines(ms)
    setBuildingOptions(Array.from(new Set(ms.map(m => m.building).filter(Boolean))) as string[])
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const t = `${y}-${m}-${d}`
    setDate(t)
    setStats(await api.getAdminStats(t))
    setBlack(await api.getBlacklist())
  }

  useEffect(() => { loadAll() }, [])

  async function addMachine() {
    try {
      setError('')
      await api.addMachine({ name, location, building, floor, guide, status: 'idle' as any })
      setName(''); setLocation(''); setBuilding(''); setFloor(''); setGuide('')
      loadAll()
    } catch (e: any) { setError(e?.message || '新增失败') }
  }
  async function remove(id: number) {
    await api.removeMachine(id)
    loadAll()
  }
  async function release(machineId: number) {
    await api.releaseSlots(machineId, undefined, date)
    alert('已释放当日全部时段')
  }
  async function exportCsv() {
    const blob = await api.exportCsv(useRange ? undefined : (exportAll ? undefined : date) || undefined, exportBuilding || undefined)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reservations-${(useRange ? `${start || 'all'}${end ? `_to_${end}` : ''}` : (date || 'all'))}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  async function seed() {
    await api.seedDemo()
    loadAll()
  }
  async function normalize() {
    await api.normalizeBuildings()
    loadAll()
  }
  async function unban(userId: number) {
    await api.updateBlacklist({ userId, bannedUntil: null })
    loadAll()
  }

  return (
    <section>
      <h2>管理端</h2>
      {error && <p className="err">{error}</p>}
      <div className="add-card">
        <h3>新增机器</h3>
        <div className="add-grid12">
          <div className="field span-4">
            <label>名称</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="例如 A区-03号" />
          </div>
          <div className="field span-4">
            <label>位置</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="例如 宿舍A楼1层" />
          </div>
          <div className="field span-2">
            <label>楼栋</label>
            <input value={building} onChange={e => setBuilding(e.target.value)} placeholder="例如 A区" />
          </div>
          <div className="field span-2">
            <label>楼层</label>
            <input value={floor} onChange={e => setFloor(e.target.value)} placeholder="例如 3层" />
          </div>
          <div className="field span-8">
            <label>使用指引（可选）</label>
            <input value={guide} onChange={e => setGuide(e.target.value)} placeholder="例如 使用完清理滤网" />
          </div>
          <div className="actions span-4">
            <button className="primary" disabled={!name || !location} onClick={addMachine}>新增机器</button>
          </div>
        </div>
      </div>
      <div className="export">
        <div className="controls">
          <label className="toggle"><input type="checkbox" checked={exportAll} onChange={e => setExportAll(e.target.checked)} /> 导出全部</label>
          <label className="toggle"><input type="checkbox" checked={useRange} onChange={e => setUseRange(e.target.checked)} disabled={exportAll} /> 按日期范围</label>
          {!useRange ? (
            <div className="grp">
              <label>日期</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={exportAll} />
            </div>
          ) : (
            <div className="grp">
              <label>开始</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} disabled={exportAll} />
              <label>结束</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} disabled={exportAll} />
            </div>
          )}
          <div className="grp">
            <label>楼栋</label>
            <select value={exportBuilding} onChange={e => setExportBuilding(e.target.value)}>
              <option value="">全部</option>
              {buildingOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button onClick={exportCsv}>导出预约CSV</button>
        </div>
      </div>
      <section>
        <h3>设备列表</h3>
        <table className="table">
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
            {machines.map(m => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{m.name}</td>
                <td>{m.location}</td>
                <td>{m.building}</td>
                <td>{m.floor}</td>
                <td>
                  <button onClick={() => release(m.id)}>释放全部时段</button>
                  <button className="danger" onClick={() => remove(m.id)}>下线</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3>统计</h3>
        {stats && (
          <div>
            <p>总预约数：{stats.total}</p>
          </div>
        )}
      </section>
      <section>
        <h3>黑名单</h3>
        <ul>
          {black.map(b => (
            <li key={b.id}>{b.name} 截止：{b.bannedUntil} <button onClick={() => unban(b.id)}>解除</button></li>
          ))}
        </ul>
      </section>
      <section>
        <h3>批量生成/规范化</h3>
        <button onClick={seed}>生成演示设备</button>
        <button onClick={normalize}>规范楼区名称</button>
      </section>
    </section>
  )
}


