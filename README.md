# 校园洗衣预约系统（Vue 3 + Express + NeDB）

前端以 Vue 3 + Vite 构建，后端使用 Express，数据持久化采用 NeDB（文件型数据库，免安装）。已内置示例账号与种子数据，可直接启动使用。

## 一、快速开始

1) 启动后端（3000 端口）

```powershell
cd server
npm i
npm run dev
```

2) 启动前端（5173 端口）

```powershell
cd client
npm i
npm run dev
```

打开前端地址：`http://localhost:5173`

示例账号：
- 管理员：admin / admin123（可访问 /admin）
- 学生：student / 123456

## 二、技术栈
- 前端：Vue 3、Vite、Vue Router、Pinia、原生 fetch 封装
- 后端：Node.js、Express、NeDB（@seald-io/nedb）、jsonwebtoken、CORS
- 其它：CSS Grid/Flex 自适应布局，JWT 本地持久化，README & 脚本

## 三、功能概览

- 登录与权限
  - JWT 登录、角色（管理员/用户）、路由守卫与接口鉴权
  - 登录页全屏显示，内置示例账号提示

- 洗衣机与预约（前端为主）
  - 列表：搜索、按楼栋/楼层筛选、只看空闲、收藏筛选
  - 详情：展示位置/状态/使用指引；按日期查看当日时段
  - 预约：选择日期/时段；当天已过时段置灰并拒绝提交
  - 我的预约：状态（待开始/进行中/已完成）、倒计时、取消、改期、轮询刷新

- 预约规则与校验（后端）
  - 同机同起时段唯一、用户跨机时间重叠校验
  - 当日同用户次数上限（默认 2）
  - 冷却时间：COOLDOWN_MINUTES（开发默认 0，生产默认 30 分钟）
  - 当天已过期时段禁止预约

- 日期与时段
  - 固定每日时段：8:00–22:00，整点段
  - 若当天无可约时段，预约页自动切换到次日并提示

- 管理端（/admin，仅管理员）
  - 新增/下线机器、释放时段（整日/指定时段）
  - 批量生成测试数据：按楼栋、层数、每层台数
  - 规范化工具：清洗异常“楼栋/名称”（如 A? → A区）
  - 导出预约 CSV：
    - 导出全部 / 指定日期 / 日期范围（start-end）
    - 按楼栋过滤
    - 前端携带 Authorization 下载；文件名附带导出时间戳（到秒）
  - 管理端 UI：卡片式“新增机器”，12 栅格自适应布局

## 四、目录结构
```
client/   # Vue 3 + Vite 前端
server/   # Express 后端（NeDB 数据：server/data/*.db）
```

## 五、后端 API（节选）
- Auth
  - `POST /api/login`：登录，返回 `{ token, user }`
- Machines
  - `GET /api/machines`：机器列表
  - `GET /api/machines/:id/slots?date=YYYY-MM-DD`：当天时段与可用性（含已过时段置灰）
  - `POST /api/machines`（admin）：新增机器
  - `DELETE /api/machines/:id`（admin）：下线机器
  - `POST /api/machines/:id/release`（admin）：释放当日时段
- Reservations
  - `POST /api/reservations`（auth）：创建预约（含次数/重叠/冲突/过期校验）
  - `GET /api/reservations[?userId=]`（auth）：查询（返回带状态）
  - `POST /api/reservations/:id/reschedule`（auth）：改期
  - `DELETE /api/reservations/:id`（auth）：取消
- Admin Extra
  - `GET /api/export/reservations.csv`（admin）：导出 CSV（支持 `date` / `start&end` / `building`）
  - `POST /api/admin/seed-demo`（admin）：批量生成机器
  - `POST /api/admin/normalize-buildings`（admin）：清洗楼栋/名称

所有受保护接口需在 Header 附带：`Authorization: Bearer <token>`。

## 六、环境变量
在 `server` 目录下可配置：
- `PORT`：后端端口（默认 3000）
- `COOLDOWN_MINUTES`：预约冷却时间（分钟）。开发可设为 0 关闭；生产默认 30。

## 七、常见问题
- “Failed to fetch”
  - 后端未启动或端口被占用；确认 `http://localhost:3000/api/machines` 可访问
- “未登录”
  - token 过期/被清空，重新登录；或直接用示例账号
- 导出 CSV 弹出未登录空白页
  - 已优化为页面内下载（带 Authorization），刷新管理端再导出

## 八、示例账号
- 管理员：admin / admin123
- 学生：student / 123456

—— 如需部署指南/PPT 汇报大纲或接口文档细化，欢迎继续提出需求。
