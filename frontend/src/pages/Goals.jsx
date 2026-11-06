import { useCallback, useEffect, useState } from 'react'
import { api, today } from '../api.js'

const TYPES = { 'Weight Loss': 'kg lost', 'Muscle Gain': 'kg gained', Steps: 'steps' }
const blank = () => ({ goal_type: 'Weight Loss', target_value: '', current_value: 0, deadline: today() })

function GoalCard({ g, reload, onError }) {
  const [val, setVal] = useState(g.current_value)
  const act = async (fn) => { try { await fn(); reload() } catch (e) { onError(e.message) } }
  return (
    <div className={`card goal ${g.status}`}>
      <div className="between">
        <h3>{g.goal_type}</h3><span className={`status ${g.status}`}>{g.status}</span>
      </div>
      <div className="bar big"><i style={{ width: `${g.progress_percent}%` }} /></div>
      <p><b>{g.current_value}</b> / {g.target_value} {TYPES[g.goal_type]} <span className="muted">({g.progress_percent}%)</span></p>
      <p className="muted">Due {g.deadline} · {g.days_left >= 0 ? `${g.days_left} days left` : `${-g.days_left} days overdue`}</p>
      {g.status === 'Active' && (
        <div className="inline">
          <input type="number" min={0} step="any" value={val} onChange={(e) => setVal(e.target.value)} aria-label="Current value" />
          <button className="btn small" onClick={() => act(() => api(`/goals/${g.id}/progress`, { method: 'PATCH', body: { current_value: Number(val) } }))}>Update progress</button>
        </div>
      )}
      <div className="inline">
        {g.status === 'Active' && <button className="link" onClick={() => act(() => api(`/goals/${g.id}`, { method: 'PUT', body: { status: 'Cancelled' } }))}>Cancel goal</button>}
        {g.status === 'Cancelled' && <button className="link" onClick={() => act(() => api(`/goals/${g.id}`, { method: 'PUT', body: { status: 'Active' } }))}>Reactivate</button>}
        <button className="link danger" onClick={() => window.confirm('Delete this goal?') && act(() => api(`/goals/${g.id}`, { method: 'DELETE' }))}>Delete</button>
      </div>
    </div>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [form, setForm] = useState(blank())
  const [error, setError] = useState('')
  const load = useCallback(() => api('/goals').then(setGoals).catch((e) => setError(e.message)), [])
  useEffect(() => { load() }, [load])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api('/goals', { method: 'POST', body: { ...form, target_value: Number(form.target_value), current_value: Number(form.current_value) } })
      setForm(blank()); load()
    } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page-head"><h1>Goals</h1></div>
      <form className="card form-grid" onSubmit={submit}>
        <h2>Set a goal</h2>
        {error && <div className="alert">{error}</div>}
        <label>Goal type<select value={form.goal_type} onChange={set('goal_type')}>{Object.keys(TYPES).map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Target ({TYPES[form.goal_type]})<input type="number" required min={0.1} step="any" value={form.target_value} onChange={set('target_value')} /></label>
        <label>Starting progress<input type="number" min={0} step="any" value={form.current_value} onChange={set('current_value')} /></label>
        <label>Deadline<input type="date" required min={today()} value={form.deadline} onChange={set('deadline')} /></label>
        <div className="actions"><button className="btn">Set goal</button></div>
      </form>
      {goals.length === 0 && <p className="empty">No goals yet. Set one above to start tracking.</p>}
      <div className="goal-grid">{goals.map((g) => <GoalCard key={g.id} g={g} reload={load} onError={setError} />)}</div>
    </>
  )
}
