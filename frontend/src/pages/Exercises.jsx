import { useEffect, useState } from 'react'
import { api, today } from '../api.js'

const CATS = ['Cardio', 'Strength', 'Yoga']

function Card({ ex }) {
  const [mode, setMode] = useState(null)
  const [date, setDate] = useState(today())
  const [cal, setCal] = useState(ex.duration * 7)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const run = async (fn, ok) => {
    setErr(''); setMsg('')
    try { await fn(); setMsg(ok); setMode(null) } catch (e) { setErr(e.message) }
  }
  const log = () => run(() => api(`/exercises/${ex.id}/log`, { method: 'POST', body: { workout_date: date, calories_burned: Number(cal) } }), 'Added to your workouts.')
  const schedule = () => run(() => api(`/exercises/${ex.id}/schedule`, { method: 'POST', body: { scheduled_date: date } }), 'Added to your plan.')

  return (
    <div className="card ex">
      <div className="between"><h3>{ex.name}</h3><span className={`tag ${ex.category}`}>{ex.category}</span></div>
      <p className="muted">{ex.description}</p>
      <p><b>{ex.duration} min</b> suggested</p>
      {mode && (
        <div className="inline">
          <input type="date" value={date} min={mode === 'schedule' ? today() : undefined} max={mode === 'log' ? today() : undefined} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          {mode === 'log' && <input type="number" min={0} max={20000} value={cal} onChange={(e) => setCal(e.target.value)} aria-label="Calories burned" title="Calories burned" />}
          <button className="btn small" onClick={mode === 'log' ? log : schedule}>Confirm</button>
          <button className="link" onClick={() => setMode(null)}>Cancel</button>
        </div>
      )}
      {!mode && <div className="inline"><button className="btn small" onClick={() => { setMode('log'); setDate(today()) }}>Log workout</button>
        <button className="btn ghost small" onClick={() => { setMode('schedule'); setDate(today()) }}>Schedule</button></div>}
      {msg && <p className="ok">{msg}</p>}
      {err && <div className="alert">{err}</div>}
    </div>
  )
}

export default function Exercises() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(); if (q.trim()) p.set('q', q.trim()); if (cat) p.set('category', cat)
      api(`/exercises?${p}`).then(setItems).catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [q, cat])

  return (
    <>
      <div className="page-head"><h1>Exercise library</h1></div>
      <div className="card filters">
        <input type="search" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
        <div className="seg">
          {['', ...CATS].map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c || 'All'}</button>)}
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {items && items.length === 0 && <p className="empty">No exercises match your search.</p>}
      <div className="goal-grid">{items?.map((ex) => <Card key={ex.id} ex={ex} />)}</div>
    </>
  )
}
