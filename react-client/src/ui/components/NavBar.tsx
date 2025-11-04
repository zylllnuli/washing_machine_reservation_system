import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'

export default function NavBar() {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuthStore()
  return (
    <header className="nav">
      <div className="brand">校园洗衣预约</div>
      <nav className="links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'router-link-active' : undefined}>首页</NavLink>
        <NavLink to="/machines" className={({ isActive }) => isActive ? 'router-link-active' : undefined}>洗衣机列表</NavLink>
        {user && <NavLink to="/my" className={({ isActive }) => isActive ? 'router-link-active' : undefined}>我的预约</NavLink>}
        {isAdmin && <NavLink to="/admin" className={({ isActive }) => isActive ? 'router-link-active' : undefined}>管理端</NavLink>}
        {user ? (
          <>
            <span className="user">{user.name}（{user.building}）</span>
            <button className="logout" onClick={() => { logout(); navigate('/login') }}>退出</button>
          </>
        ) : (
          <Link to="/login">登录</Link>
        )}
      </nav>
    </header>
  )
}


