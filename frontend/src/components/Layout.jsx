import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import NotificationBell from './NotificationBell.jsx'
import AchievementPopup from './AchievementPopup.jsx'

const links = [
  ['/', 'Today'],
  ['/plans', 'Plan'],
  ['/exercises', 'Exercises'],
  ['/workouts', 'Workouts'],
  ['/goals', 'Goals'],
  ['/reports', 'Reports'],
  ['/compare', 'Compare'],
  ['/achievements', 'Badges'],
]

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">FitTrack</div>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <NotificationBell />
          <span className="who">{user.username}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
      <AchievementPopup />
    </div>
  )
}
