import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Workouts from './pages/Workouts.jsx'
import Goals from './pages/Goals.jsx'
import Reports from './pages/Reports.jsx'
import Notifications from './pages/Notifications.jsx'
import Plans from './pages/Plans.jsx'
import Exercises from './pages/Exercises.jsx'
import Compare from './pages/Compare.jsx'
import Achievements from './pages/Achievements.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="center muted">Loading…</p>
  return user ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="center muted">Loading…</p>
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="plans" element={<Plans />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="workouts" element={<Workouts />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="compare" element={<Compare />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
