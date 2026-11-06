import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, today } from '../api.js'

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function Plans() {
  const now = new Date()
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [plans, setPlans] = useState([])
  const [logged, setLogged] = useState({})
  const [upcoming, setUpcoming] = useState([])
  const [sel, setSel] = useState(today())
  const [form, setForm] = useState({ title: '', description: '', scheduled_date: today() })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')

  const first = iso(cur.y, cur.m, 1)
  const last = iso(cur.y, cur.m, new Date(cur.y, cur.m + 1, 0).getDate())

  const load = useCallback(() => {
    api(`/plans?start=${first}&end=${last}`).then(setPlans).catch((e) => setError(e.message))
    api(`/workouts?start=${first}&end=${last}`).then((ws) => {
      const m = {}; ws.forEach((w) => { m[w.workout_date] = (m[w.workout_date] || 0) + 1 }); setLogged(m)
    }).catch(() => {})
    api('/plans/upcoming?limit=8').then(setUpcoming).catch(() => {})
  }, [first, last])
  useEffect(() => { load() }, [load])

  const byDate = useMemo(() => {
    const m = {}; plans.forEach((p) => (m[p.scheduled_date] ||= []).push(p)); return m
  }, [plans])

  const cells = useMemo(() => {
    const offset = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7 // Monday first
    const days = new Date(cur.y, cur.m + 1, 0).getDate()
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  }, [cur])

  const pick = (date) => { setSel(date); if (!editId) setForm((f) => ({ ...f, scheduled_date: date })) }
  const move = (n) => { const d = new Date(cur.y, cur.m + n, 1); setCur({ y: d.getFullYear(), m: d.getMonth() }) }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const reset = () => { setEditId(null); setForm({ title: '', description: '', scheduled_date: sel }) }

  const submit = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editId) await api(`/plans/${editId}`, { method: 'PUT', body: form })
      else await api('/plans', { method: 'POST', body: form })
      setSel(form.scheduled_date); reset(); load()
    } catch (err) { setError(err.message) }
  }
  const toggle = async (p) => { await api(`/plans/${p.id}`, { method: 'PUT', body: { is_completed: !p.is_completed } }); load() }
  const del = async (p) => { if (window.confirm(`Delete "${p.title}"?`)) { await api(`/plans/${p.id}`, { method: 'DELETE' }); load() } }
  const edit = (p) => { setEditId(p.id); setForm({ title: p.title, description: p.description, scheduled_date: p.scheduled_date }) }

  const dayPlans = byDate[sel] || []

  return (
    <>
      <div className="page-head"><h1>Workout plans</h1></div>
      <div className="grid2 plan-layout">
        <section className="card">
          <div className="between month-nav">
            <button className="btn ghost small" onClick={() => move(-1)}>‹ Prev</button>
            <b>{new Date(cur.y, cur.m).toLocaleString('en', { month: 'long', year: 'numeric' })}</b>
            <button className="btn ghost small" onClick={() => move(1)}>Next ›</button>
          </div>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} />
              const date = iso(cur.y, cur.m, d), ps = byDate[date] || []
              return (
                <button key={date} className={`cal-day ${date === today() ? 'is-today' : ''} ${date === sel ? 'is-sel' : ''}`} onClick={() => pick(date)}
                  aria-label={`${date}: ${ps.length} planned, ${logged[date] || 0} logged`}>
                  <span>{d}</span>
                  <span className="dots">
                    {ps.slice(0, 3).map((p) => <i key={p.id} className={p.is_completed ? 'done' : 'plan'} />)}
                    {logged[date] > 0 && <i className="log" />}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="legend muted"><i className="plan" /> planned <i className="done" /> completed <i className="log" /> workout logged</p>
        </section>

        <section className="card">
          <h2>{new Date(sel + 'T00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {dayPlans.length === 0 && <p className="empty">Nothing planned for this day.</p>}
          <ul className="plain">
            {dayPlans.map((p) => (
              <li key={p.id} className="plan-item">
                <label className="check"><input type="checkbox" checked={p.is_completed} onChange={() => toggle(p)} />
                  <span className={p.is_completed ? 'struck' : ''}><b>{p.title}</b>{p.description && <small className="muted"> {p.description}</small>}</span></label>
                <span><button className="link" onClick={() => edit(p)}>Edit</button><button className="link danger" onClick={() => del(p)}>Delete</button></span>
              </li>
            ))}
          </ul>
          <form className="plan-form" onSubmit={submit}>
            <h3>{editId ? 'Edit plan' : 'Schedule a workout'}</h3>
            {error && <div className="alert">{error}</div>}
            <label>Title<input required maxLength={100} value={form.title} onChange={set('title')} placeholder="Leg day" /></label>
            <label>Notes<input maxLength={500} value={form.description} onChange={set('description')} placeholder="5 x 5 squats, lunges" /></label>
            <label>Date<input type="date" required min={editId ? undefined : today()} value={form.scheduled_date} onChange={set('scheduled_date')} /></label>
            <div className="actions"><button className="btn">{editId ? 'Save plan' : 'Add to schedule'}</button>
              {editId && <button type="button" className="btn ghost" onClick={reset}>Cancel</button>}</div>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Upcoming workouts</h2>
        {upcoming.length === 0 && <p className="empty">No upcoming workouts. Pick a date on the calendar to plan one.</p>}
        <ul className="plain">
          {upcoming.map((p) => (
            <li key={p.id} className="row"><b>{p.title}</b>
              <span className="muted">{new Date(p.scheduled_date + 'T00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}</span></li>
          ))}
        </ul>
      </section>
    </>
  )
}
