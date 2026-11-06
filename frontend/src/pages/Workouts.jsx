import { useCallback, useEffect, useState } from 'react'
import { api, today } from '../api.js'

const CATS = ['Cardio', 'Strength', 'Yoga']
const blank = () => ({ workout_name: '', category: 'Cardio', duration: 30, calories_burned: 200, workout_date: today() })

export default function Workouts() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState(blank())
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    api(`/workouts${filter ? `?category=${filter}` : ''}`).then(setItems).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [filter])
  useEffect(load, [load])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const body = { ...form, duration: Number(form.duration), calories_burned: Number(form.calories_burned) }
    try {
      if (editId) await api(`/workouts/${editId}`, { method: 'PUT', body })
      else await api('/workouts', { method: 'POST', body })
      setForm(blank()); setEditId(null); load()
    } catch (err) { setError(err.message) }
  }

  const edit = (w) => {
    setEditId(w.id)
    setForm({ workout_name: w.workout_name, category: w.category, duration: w.duration, calories_burned: w.calories_burned, workout_date: w.workout_date })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const remove = async (w) => {
    if (!window.confirm(`Delete "${w.workout_name}"?`)) return
    try { await api(`/workouts/${w.id}`, { method: 'DELETE' }); load() } catch (err) { setError(err.message) }
  }

  return (
    <>
      <div className="page-head"><h1>Workouts</h1></div>
      <form className="card form-grid" onSubmit={submit}>
        <h2>{editId ? 'Edit workout' : 'Add workout'}</h2>
        {error && <div className="alert">{error}</div>}
        <label>Name<input required maxLength={100} value={form.workout_name} onChange={set('workout_name')} placeholder="Morning run" /></label>
        <label>Category
          <select value={form.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Duration (min)<input type="number" required min={1} max={1440} value={form.duration} onChange={set('duration')} /></label>
        <label>Calories burned<input type="number" required min={0} max={20000} value={form.calories_burned} onChange={set('calories_burned')} /></label>
        <label>Date<input type="date" required value={form.workout_date} onChange={set('workout_date')} /></label>
        <div className="actions">
          <button className="btn">{editId ? 'Save changes' : 'Add workout'}</button>
          {editId && <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(blank()) }}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <div className="between">
          <h2>Your workouts</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {loading && <p className="muted">Loading…</p>}
        {!loading && items.length === 0 && <p className="empty">No workouts yet. Add your first one above.</p>}
        <div className="table-wrap">
          {items.length > 0 && (
            <table>
              <thead><tr><th>Date</th><th>Workout</th><th>Category</th><th>Min</th><th>kcal</th><th></th></tr></thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td>{w.workout_date}</td><td>{w.workout_name}</td>
                    <td><span className={`tag ${w.category}`}>{w.category}</span></td>
                    <td>{w.duration}</td><td>{w.calories_burned}</td>
                    <td className="right">
                      <button className="link" onClick={() => edit(w)}>Edit</button>
                      <button className="link danger" onClick={() => remove(w)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  )
}
