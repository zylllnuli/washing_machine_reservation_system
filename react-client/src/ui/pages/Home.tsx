import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section>
      <h1>欢迎使用校园洗衣预约系统</h1>
      <p>选择洗衣机、查看空闲时段、快速预约。</p>
      <Link className="btn" to="/machines">开始预约</Link>
    </section>
  )
}


