import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, today } from '../api.js'

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }
const fmt = (d) => new Date(d + 'T00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Dashboard() {
  const [day, setDay] = useState(today())
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api(`/dashboard?on=${day}`).then(setD).catch((e) => setError(e.message)), [day])
  useEffect(() => { load() }, [load])

  const completePlan = async (id) => { await api(`/plans/${id}`, { method: 'PUT', body: { is_completed: true } }); load() }
  const isToday = day === today()

  if (error) return <div className="alert">{error}</div>
  if (!d) return <p className="muted">Loading…</p>
  const s = d.streak

  return (
    <>
      <div className="page-head">
        <div><h1>{greeting()}, {d.username}</h1>
          <p className="muted">{s.current_streak > 0 ? (s.active_today ? `You're on a ${s.current_streak}-day streak. Nice work today.` : `Work out today to extend your ${s.current_streak}-day streak.`) : 'Log a workout today to start a streak.'}</p></div>
        <input type="date" value={day} max={today()} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Summary date" />
      </div>

      <section className="cards">
        <div className="card stat"><span className="muted">{isToday ? 'Workouts today' : 'Workouts'}</span><strong>{d.daily.total_workouts}</strong></div>
        <div className="card stat"><span className="muted">Calories burned</span><strong>{d.daily.total_calories}<small>kcal</small></strong></div>
        <div className="card stat"><span className="muted">Active time</span><strong>{d.daily.total_minutes}<small>min</small></strong></div>
        <Link to="/achievements" className="card stat streak-card"><span className="muted">Current streak</span><strong>🔥 {s.current_streak}<small>days</small></strong><small className="muted">Best: {s.longest_streak}</small></Link>
      </section>

      <div className="grid2">
        <section className="card">
          <div className="between"><h2>Upcoming workouts</h2><Link to="/plans">Open planner</Link></div>
          {d.upcoming.length === 0 && <p className="empty">Nothing scheduled. <Link to="/plans">Plan a workout</Link></p>}
          <ul className="plain">
            {d.upcoming.map((p) => (
              <li key={p.id} className="row">
                <b>{p.title}</b><span className="muted">{p.scheduled_date === today() ? 'Today' : fmt(p.scheduled_date)}</span>
                <button className="link" onClick={() => completePlan(p.id)}>Mark done</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="between"><h2>Goal progress</h2><Link to="/goals">Manage</Link></div>
          {d.goals.length === 0 && <p className="empty">No active goals. <Link to="/goals">Set one</Link></p>}
          {d.goals.map((g) => (
            <div key={g.id} className="goal-mini">
              <span>{g.goal_type}</span>
              <div className="bar"><i style={{ width: `${g.progress_percent}%` }} /></div>
              <b>{g.progress_percent}%</b>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>{isToday ? "Today's workouts" : `Workouts on ${fmt(day)}`}</h2>
          {d.daily.workouts.length === 0 && <p className="empty">No workouts logged. <Link to="/exercises">Pick an exercise</Link></p>}
          <ul className="plain">
            {d.daily.workouts.map((w) => (
              <li key={w.id} className="row"><span className={`tag ${w.category}`}>{w.category}</span><b>{w.workout_name}</b>
                <span className="muted">{w.duration} min · {w.calories_burned} kcal</span></li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="between"><h2>Badges</h2><Link to="/achievements">{d.badges.earned} of {d.badges.total}</Link></div>
          {d.badges.recent.length === 0 ? <p className="empty">Complete a workout to earn your first badge.</p> : (
            <div className="badge-row">{d.badges.recent.map((b) => <div key={b.name} className="mini-badge" title={b.description}><span>{b.icon}</span>{b.name}</div>)}</div>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Last 7 days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.week}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis width={40} tick={{ fontSize: 11 }} />
            <Tooltip /><Bar dataKey="calories" name="Calories" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  )
}
