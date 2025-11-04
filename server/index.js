import express from 'express'
import cors from 'cors'
import Datastore from '@seald-io/nedb'
import jwt from 'jsonwebtoken'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

const db = {
	machines: new Datastore({ filename: './data/machines.db', autoload: true }),
	reservations: new Datastore({ filename: './data/reservations.db', autoload: true }),
	users: new Datastore({ filename: './data/users.db', autoload: true })
}

db.machines.ensureIndex({ fieldName: 'id', unique: true })
db.reservations.ensureIndex({ fieldName: 'id', unique: true })
db.reservations.ensureIndex({ fieldName: 'userId' })
db.reservations.ensureIndex({ fieldName: 'machineId' })
db.reservations.ensureIndex({ fieldName: 'date' })
db.reservations.ensureIndex({ fieldName: 'createdAt' })
db.users.ensureIndex({ fieldName: 'username', unique: true })
db.users.ensureIndex({ fieldName: 'id', unique: true })

let nextIds = { machine: 1, reservation: 1, user: 1 }

function initSeed() {
	db.machines.count({}, (err, count) => {
		if (!count) {
			const seed = [
				{ id: nextIds.machine++, name: 'A区-01号', building: 'A区', floor: '1层', location: '宿舍A楼1层', status: 'idle', guide: '放入衣物，加入洗衣液，选择模式后启动。' },
				{ id: nextIds.machine++, name: 'A区-02号', building: 'A区', floor: '1层', location: '宿舍A楼1层', status: 'busy', guide: '忙碌时请耐心等待或选择其它机器。' },
				{ id: nextIds.machine++, name: 'A区-03号', building: 'A区', floor: '2层', location: '宿舍A楼2层', status: 'idle', guide: '请先检查内筒是否有遗留物。' },
				{ id: nextIds.machine++, name: 'A区-04号', building: 'A区', floor: '3层', location: '宿舍A楼3层', status: 'idle', guide: '使用完毕请及时取走衣物。' },
				{ id: nextIds.machine++, name: 'B区-01号', building: 'B区', floor: '1层', location: '宿舍B楼1层', status: 'idle', guide: '建议轻薄衣物选择快速模式。' },
				{ id: nextIds.machine++, name: 'B区-02号', building: 'B区', floor: '2层', location: '宿舍B楼2层', status: 'idle', guide: '请勿超负荷使用。' },
				{ id: nextIds.machine++, name: 'B区-03号', building: 'B区', floor: '3层', location: '宿舍B楼3层', status: 'busy', guide: '维护保养中请勿操作。' },
				{ id: nextIds.machine++, name: 'C区-01号', building: 'C区', floor: '1层', location: '宿舍C楼1层', status: 'idle', guide: '使用完毕请清理滤网。' },
				{ id: nextIds.machine++, name: 'C区-02号', building: 'C区', floor: '3层', location: '宿舍C楼3层', status: 'idle', guide: '请先检查内筒是否有遗留物。' },
				{ id: nextIds.machine++, name: 'C区-03号', building: 'C区', floor: '4层', location: '宿舍C楼4层', status: 'idle', guide: '夜间请降低噪音影响他人。' }
			]
			db.machines.insert(seed)
		}
	})
	db.machines.find({}).sort({ id: -1 }).limit(1).exec((_, docs) => { if (docs[0]) nextIds.machine = docs[0].id + 1 })
	db.reservations.find({}).sort({ id: -1 }).limit(1).exec((_, docs) => { if (docs[0]) nextIds.reservation = docs[0].id + 1 })
	db.users.find({}).sort({ id: -1 }).limit(1).exec((_, docs) => { if (docs[0]) nextIds.user = docs[0].id + 1 })

	// seed users
	db.users.count({}, (err, count) => {
		if (!count) {
			const users = [
				{ id: nextIds.user++, username: 'admin', password: 'admin123', name: '管理员', role: 'admin', building: 'A区', bannedUntil: null },
				{ id: nextIds.user++, username: 'student', password: '123456', name: '学生', role: 'user', building: 'B区', bannedUntil: null }
			]
			db.users.insert(users)
		}
	})
}

const DAILY_START_HOUR = 8
const DAILY_END_HOUR = 22
const DAILY_LIMIT_PER_USER = 2
const COOLDOWN_MINUTES = Number(process.env.COOLDOWN_MINUTES ?? (process.env.NODE_ENV === 'production' ? 30 : 0))

function toDateKey(d) {
	if (typeof d === 'string') return d
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function todayHourToDate(dateKey, hourStr) {
	const [h] = hourStr.split(':').map(Number)
	const [y, m, d] = dateKey.split('-').map(Number)
	return new Date(y, m - 1, d, h, 0, 0, 0)
}

function computeReservationStatus(r) {
	const now = new Date()
	const start = todayHourToDate(r.date, r.start)
	const end = todayHourToDate(r.date, r.end)
	if (now < start) return 'pending'
	if (now >= start && now < end) return 'ongoing'
	return 'completed'
}

function generateDailySlots(machineId, dateKey) {
	const slots = []
	let idx = 0
	for (let h = DAILY_START_HOUR; h < DAILY_END_HOUR; h++) {
		slots.push({ id: machineId * 1000 + idx, start: `${h}:00`, end: `${h + 1}:00`, available: true })
		idx++
	}
	return slots
}

function hasTimeOverlap(aStart, aEnd, bStart, bEnd) {
	const aS = Number(aStart.split(':')[0])
	const aE = Number(aEnd.split(':')[0])
	const bS = Number(bStart.split(':')[0])
	const bE = Number(bEnd.split(':')[0])
	return !(aE <= bS || bE <= aS)
}

function authMiddleware(req, res, next) {
	const auth = req.headers.authorization || ''
	const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
	if (!token) return res.status(401).json({ message: '未登录' })
	try {
		const payload = jwt.verify(token, JWT_SECRET)
		req.user = payload
		next()
	} catch (e) {
		return res.status(401).json({ message: '登录已失效' })
	}
}

function requireAdmin(req, res, next) {
	if (req.user?.role !== 'admin') return res.status(403).json({ message: '需要管理员权限' })
	next()
}

// Auth
app.post('/api/login', (req, res) => {
	const { username, password } = req.body || {}
	if (!username || !password) return res.status(400).json({ message: '缺少用户名或密码' })
	db.users.findOne({ username }, (err, user) => {
		if (!user || user.password !== password) return res.status(401).json({ message: '用户名或密码错误' })
		const token = jwt.sign({ id: user.id, name: user.name, role: user.role, building: user.building }, JWT_SECRET, { expiresIn: '7d' })
		res.json({ token, user: { id: user.id, name: user.name, role: user.role, building: user.building } })
	})
})

// Public
app.get('/api/machines', (req, res) => {
	db.machines.find({}).sort({ id: 1 }).exec((err, docs) => { res.json(docs) })
})
app.get('/api/machines/:id/slots', (req, res) => {
	const machineId = Number(req.params.id)
	const dateKey = req.query.date ? String(req.query.date) : toDateKey(new Date())
	const slots = generateDailySlots(machineId, dateKey)
	// Mark past slots for today as unavailable
	const now = new Date()
	const isToday = toDateKey(now) === dateKey
	if (isToday) {
		const currentHour = now.getHours()
		for (const s of slots) {
			const h = Number(s.start.split(':')[0])
			if (h + 1 <= currentHour) s.available = false
		}
	}
	db.reservations.find({ machineId, date: dateKey }, (err, docs) => {
		for (const r of docs) {
			const s = slots.find(x => x.start === r.start)
			if (s) s.available = false
		}
		res.json(slots)
	})
})

// Admin: machines
app.post('/api/machines', authMiddleware, requireAdmin, (req, res) => {
	const { name, location, status, building, floor, guide } = req.body || {}
	if (!name || !location) return res.status(400).json({ message: '缺少名称或位置' })
	const m = { id: nextIds.machine++, name, location, status: status || 'idle', building: building || guessBuilding(location), floor: floor || '', guide: guide || '' }
	db.machines.insert(m, (err, doc) => { res.status(201).json(doc) })
})
app.delete('/api/machines/:id', authMiddleware, requireAdmin, (req, res) => {
	const id = Number(req.params.id)
	db.machines.remove({ id }, {}, () => {
		db.reservations.remove({ machineId: id }, { multi: true }, () => res.status(204).end())
	})
})
app.post('/api/machines/:id/release', authMiddleware, requireAdmin, (req, res) => {
	const id = Number(req.params.id)
	const { date, slotId } = req.body || {}
	const dateKey = date ? String(date) : toDateKey(new Date())
	if (slotId) {
		db.reservations.findOne({ machineId: id, date: dateKey, slotId }, (err, r) => {
			if (r) db.reservations.remove({ id: r.id }, {}, () => res.json({ ok: true }))
			else res.json({ ok: true })
		})
	} else {
		db.reservations.remove({ machineId: id, date: dateKey }, { multi: true }, () => res.json({ ok: true }))
	}
})

// Admin: CSV export
app.get('/api/export/reservations.csv', authMiddleware, requireAdmin, (req, res) => {
	const dateKey = req.query.date ? String(req.query.date) : ''
	const start = req.query.start ? String(req.query.start) : ''
	const end = req.query.end ? String(req.query.end) : ''
	const building = req.query.building ? String(req.query.building) : ''
	let query = {}
	if (dateKey) query = { ...query, date: dateKey }
	if (!dateKey && (start || end)) {
		query = { ...query, date: {} }
		if (start) query.date.$gte = start
		if (end) query.date.$lte = end
	}
	db.reservations.find(query).sort({ date: 1, start: 1 }).exec((err, rows) => {
		const ids = Array.from(new Set(rows.map(r => r.machineId)))
		db.machines.find({ id: { $in: ids } }, (e2, ms) => {
			const idToMachine = new Map(ms.map(m => [m.id, m]))
			const filtered = building ? rows.filter(r => (idToMachine.get(r.machineId)?.building === building)) : rows
			const header = 'id,userId,machineId,machineName,building,floor,date,start,end\n'
			const csv = filtered.map(r => {
				const m = idToMachine.get(r.machineId)
				return [r.id, r.userId, r.machineId, r.machineName, m?.building || '', m?.floor || '', r.date, r.start, r.end].join(',')
			}).join('\n')
			res.setHeader('Content-Type', 'text/csv; charset=utf-8')
			const name = dateKey ? dateKey : (start || 'all') + (end ? `_to_${end}` : '')
			res.setHeader('Content-Disposition', `attachment; filename=reservations-${name}.csv`)
			res.send('\uFEFF' + header + csv)
		})
	})
})

// Admin: stats
app.get('/api/admin/stats', authMiddleware, requireAdmin, (req, res) => {
	const dateKey = req.query.date ? String(req.query.date) : toDateKey(new Date())
	db.reservations.find({ date: dateKey }).exec((err, rows) => {
		const total = rows.length
		const byHour = {}
		for (const r of rows) {
			const h = r.start.split(':')[0]
			byHour[h] = (byHour[h] || 0) + 1
		}
		const ids = Array.from(new Set(rows.map(r => r.machineId)))
		db.machines.find({ id: { $in: ids } }, (e2, ms) => {
			const idToMachine = new Map(ms.map(m => [m.id, m]))
			const byBuilding = {}
			for (const r of rows) {
				const b = idToMachine.get(r.machineId)?.building || '未知'
				byBuilding[b] = (byBuilding[b] || 0) + 1
			}
			res.json({ date: dateKey, total, byHour, byBuilding })
		})
	})
})

// Admin: blacklist
app.get('/api/admin/blacklist', authMiddleware, requireAdmin, (req, res) => {
	db.users.find({ bannedUntil: { $ne: null } }, (err, users) => {
		res.json(users.map(u => ({ id: u.id, username: u.username, name: u.name, bannedUntil: u.bannedUntil })))
	})
})
app.post('/api/admin/blacklist', authMiddleware, requireAdmin, (req, res) => {
	const { userId, bannedUntil } = req.body || {}
	if (!userId) return res.status(400).json({ message: '缺少用户ID' })
	db.users.update({ id: Number(userId) }, { $set: { bannedUntil: bannedUntil || null } }, {}, (err, n) => {
		if (!n) return res.status(404).json({ message: '用户不存在' })
		res.json({ ok: true })
	})
})

// Admin: bulk seed demo machines
app.post('/api/admin/seed-demo', authMiddleware, requireAdmin, (req, res) => {
	const { buildings = ['A区','B区','C区'], floorsPerBuilding = 5, machinesPerFloor = 3 } = req.body || {}
	let created = 0
	const docs = []
	for (const b of buildings) {
		for (let f = 1; f <= floorsPerBuilding; f++) {
			for (let i = 1; i <= machinesPerFloor; i++) {
				const floorLabel = `${f}层`
				const name = `${b}-${String(i).padStart(2,'0')}号`
				docs.push({ id: nextIds.machine++, name, building: b, floor: floorLabel, location: `宿舍${b[0]}楼${floorLabel}`, status: Math.random() > 0.8 ? 'busy' : 'idle', guide: '请按步骤操作，注意安全。' })
				created++
			}
		}
	}
	db.machines.insert(docs, (err) => {
		if (err) return res.status(500).json({ message: '生成失败' })
		res.json({ ok: true, created })
	})
})

// Admin: normalize building labels
app.post('/api/admin/normalize-buildings', authMiddleware, requireAdmin, (req, res) => {
	db.machines.find({}, (err, docs) => {
		if (err) return res.status(500).json({ message: '读取失败' })
		let updated = 0
		const ops = docs.map(m => {
			let b = (m.building || '').toString().trim()
			if (/^[A-Z]$/.test(b)) b = b + '区'
			if (/^[A-Z]\?$/.test(b)) b = b[0] + '区'
			if (/^[A-Z]楼$/.test(b)) b = b[0] + '区'
			let name = (m.name || '').toString().trim()
			name = name.replace(/^([A-Z])\?-(\d{2}号)/, (_, p1, p2) => `${p1}区-${p2}`)
			name = name.replace(/^([A-Z])-(\d{2}号)$/, (_, p1, p2) => `${p1}区-${p2}`)
			if (b !== m.building || name !== m.name) {
				updated++
				return new Promise(resolve => db.machines.update({ id: m.id }, { $set: { building: b, name } }, {}, () => resolve()))
			}
			return Promise.resolve()
		})
		Promise.all(ops).then(() => res.json({ ok: true, updated }))
	})
})

// Reservations (auth required)
app.post('/api/reservations', authMiddleware, (req, res) => {
	const { machineId, slotId, date } = req.body
	const userId = req.user.id
	if (!userId || !machineId || !slotId) return res.status(400).json({ message: '参数缺失' })
	const dateKey = date ? String(date) : toDateKey(new Date())
	const slots = generateDailySlots(machineId, dateKey)
	const slot = slots.find(s => s.id === slotId)
	if (!slot) return res.status(404).json({ message: '时段不存在' })
	// Reject past slots for today
	const now = new Date()
	if (toDateKey(now) === dateKey) {
		const h = Number(slot.end.split(':')[0])
		if (now.getHours() >= h) return res.status(400).json({ message: '该时段已过期，无法预约' })
	}
	// blacklist check
	db.users.findOne({ id: userId }, (e0, u) => {
		if (u?.bannedUntil) {
			const until = new Date(u.bannedUntil)
			if (new Date() < until) return res.status(403).json({ message: '账号被限制预约' })
		}
		// cooldown check: last createdAt
		db.reservations.find({ userId }).sort({ createdAt: -1 }).limit(1).exec((eL, lastArr) => {
			if (lastArr && lastArr[0]?.createdAt) {
				const last = new Date(lastArr[0].createdAt)
				const diffMin = (Date.now() - last.getTime()) / 60000
				if (diffMin < COOLDOWN_MINUTES) {
					return res.status(429).json({ message: `操作过于频繁，请${Math.ceil(COOLDOWN_MINUTES - diffMin)}分钟后再试` })
				}
			}
			// per-day limit & overlap
			db.reservations.count({ userId, date: dateKey }, (err, count) => {
				if (count >= DAILY_LIMIT_PER_USER) return res.status(429).json({ message: `单日最多预约${DAILY_LIMIT_PER_USER}次` })
				db.reservations.find({ userId, date: dateKey }, (err2, list) => {
					if (list.some(r => hasTimeOverlap(r.start, r.end, slot.start, slot.end))) return res.status(409).json({ message: '与您当天其他预约时间重叠' })
					db.reservations.findOne({ machineId, date: dateKey, start: slot.start }, (err3, exist) => {
						if (exist) return res.status(409).json({ message: '该时段已被预约' })
						db.machines.findOne({ id: machineId }, (_, m) => {
							const r = { id: nextIds.reservation++, userId, machineId, machineName: m?.name || `机-${machineId}`, date: dateKey, start: slot.start, end: slot.end, createdAt: new Date().toISOString() }
							db.reservations.insert(r, () => res.status(201).json(r))
						})
					})
				})
			})
		})
	})
})

app.get('/api/reservations', authMiddleware, (req, res) => {
	const userId = Number(req.query.userId) || req.user.id
	const query = userId ? { userId } : {}
	db.reservations.find(query).sort({ date: 1, start: 1 }).exec((err, docs) => {
		res.json(docs.map(r => ({ ...r, status: computeReservationStatus(r) })))
	})
})

app.post('/api/reservations/:id/reschedule', authMiddleware, (req, res) => {
	const id = Number(req.params.id)
	const { date, slotId } = req.body || {}
	if (!date || !slotId) return res.status(400).json({ message: '缺少日期或时段' })

	db.reservations.findOne({ id }, (err, r) => {
		if (!r) return res.status(404).json({ message: '预约不存在' })
		if (r.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: '无权限修改' })
		const dateKey = String(date)
		const slots = generateDailySlots(r.machineId, dateKey)
		const slot = slots.find(s => s.id === slotId)
		if (!slot) return res.status(404).json({ message: '新时段不存在' })

		db.reservations.find({ userId: r.userId, date: dateKey, id: { $ne: id } }, (e2, list) => {
			if (list.some(x => hasTimeOverlap(x.start, x.end, slot.start, slot.end))) return res.status(409).json({ message: '与您当天其他预约时间重叠' })
			db.reservations.findOne({ machineId: r.machineId, date: dateKey, start: slot.start, id: { $ne: id } }, (e3, exist) => {
				if (exist) return res.status(409).json({ message: '该时段已被预约' })
				db.reservations.update({ id }, { $set: { date: dateKey, start: slot.start, end: slot.end } }, {}, () => res.json({ ok: true }))
			})
		})
	})
})

app.delete('/api/reservations/:id', authMiddleware, (req, res) => {
	const id = Number(req.params.id)
	db.reservations.findOne({ id }, (err, r) => {
		if (!r) return res.status(204).end()
		if (r.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: '无权限取消' })
		db.reservations.remove({ id }, {}, () => res.status(204).end())
	})
})

function guessBuilding(location) {
	const m = location.match(/([A-Z]区)/)
	return m ? m[1] : '未知'
}

initSeed()

const PORT = process.env.PORT || 3000
app.listen(PORT, () => { console.log(`Mock API listening on http://localhost:${PORT}`) })
