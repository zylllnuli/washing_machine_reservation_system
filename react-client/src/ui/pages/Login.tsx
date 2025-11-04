import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuthStore } from '../../stores/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setSession = useAuthStore(s => s.setSession)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const data = await api.login({ username, password }) as any
      setSession(data.token, data.user)
      const redirect = params.get('redirect') || '/'
      navigate(redirect)
    } catch (e: any) {
      setError(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 360, background: '#fff', border: '1px solid #e6eaf0', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
        <h2 style={{ marginTop: 0 }}>登录</h2>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>用户名</label>
            <input value={username} placeholder="admin 或 student" onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>密码</label>
            <input type="password" value={password} placeholder="请输入密码" onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="err">{error}</p>}
          <button className="primary" type="submit" disabled={!username || !password || loading}>{loading ? '登录中...' : '登录'}</button>
        </form>
        <p>演示账号：admin/admin123 或 student/123456</p>
      </div>
    </section>
  )
}


