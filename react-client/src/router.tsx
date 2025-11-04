import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import App from './ui/App'
import Home from './ui/pages/Home'
import Machines from './ui/pages/Machines'
import MachineDetail from './ui/pages/MachineDetail'
import Booking from './ui/pages/Booking'
import MyReservations from './ui/pages/MyReservations'
import Login from './ui/pages/Login'
import Admin from './ui/pages/Admin'

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = useAuthStore.getState().isAuthed
  return isAuthed ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const s = useAuthStore.getState()
  return s.isAuthed && s.isAdmin ? children : <Navigate to="/" replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'machines', element: <Machines /> },
      { path: 'machines/:id', element: <MachineDetail /> },
      { path: 'booking/:machineId', element: <RequireAuth><Booking /></RequireAuth> },
      { path: 'my', element: <RequireAuth><MyReservations /></RequireAuth> },
      { path: 'admin', element: <RequireAdmin><Admin /></RequireAdmin> }
    ]
  },
  { path: '/login', element: <Login /> }
])


