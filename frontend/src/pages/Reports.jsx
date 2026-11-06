import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.js'

const COLORS = { Cardio: '#e4572e', Strength: '#2b4162', Yoga: '#2e8b73' }
const now = new Date()

export default function Reports() {
  const [mode, setMode] = useState('weekly')
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    const path = mode === 'weekly' ? '/reports/weekly' : `/reports/monthly?year=${ym.year}&month=${ym.month}`
    api(path).then(setData).catch((e) => setError(e.message))
  }, [mode, ym])

  const shift = (n) => {
    const d = new Date(ym.year, ym.month - 1 + n, 1)
    setYm({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  const diff = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}% vs previous` : 'no previous data')
  const t = data?.totals

  return (
    <>
      <div className="page-head">
        <h1>Reports</h1>
        <div className="seg">
          <button className={mode === 'weekly' ? 'on' : ''} onClick={() => setMode('weekly')}>Weekly</button>
          <button className={mode === 'monthly' ? 'on' : ''} onClick={() => setMode('monthly')}>Monthly</button>
        </div>
      </div>
      {mode === 'monthly' && (
        <div className="month-nav">
          <button className="btn ghost small" onClick={() => shift(-1)}>‹ Prev</button>
          <b>{new Date(ym.year, ym.month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })}</b>
          <button className="btn ghost small" onClick={() => shift(1)}>Next ›</button>
        </div>
      )}
      {error && <div className="alert">{error}</div>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <section className="cards">
            <div className="card stat"><span className="muted">Workouts</span><strong>{t.workouts}</strong><small className="muted">{diff(t.workouts, data.previous.workouts)}</small></div>
            <div className="card stat"><span className="muted">Calories</span><strong>{t.calories}</strong><small className="muted">{diff(t.calories, data.previous.calories)}</small></div>
            <div className="card stat"><span className="muted">Active minutes</span><strong>{t.minutes}</strong><small className="muted">{diff(t.minutes, data.previous.minutes)}</small></div>
            <div className="card stat"><span className="muted">Active days</span><strong>{t.active_days}</strong><small className="muted">{t.avg_calories_per_workout} kcal / workout</small></div>
          </section>

          <section className="card">
            <h2>Calories per day</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={mode === 'weekly' ? 'label' : (d) => d.date.slice(8)} tick={{ fontSize: 11 }} interval={mode === 'weekly' ? 0 : 1} />
                <YAxis width={44} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey="calories" name="Calories" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <div className="grid2">
            <section className="card">
              <h2>{mode === 'weekly' ? 'Minutes per day' : 'Weekly breakdown'}</h2>
              <ResponsiveContainer width="100%" height={240}>
                {mode === 'weekly' ? (
                  <LineChart data={data.days}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis width={36} tick={{ fontSize: 11 }} /><Tooltip />
                    <Line type="monotone" dataKey="minutes" name="Minutes" stroke="#2b4162" strokeWidth={2} dot />
                  </LineChart>
                ) : (
                  <BarChart data={data.weeks}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis width={44} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                    <Bar dataKey="calories" name="Calories" fill="#e4572e" /><Bar dataKey="minutes" name="Minutes" fill="#2b4162" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </section>
            <section className="card">
              <h2>By category</h2>
              {data.by_category.length === 0 ? <p className="empty">No workouts in this period.</p> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={data.by_category} dataKey="workouts" nameKey="category" outerRadius={85} label>
                      {data.by_category.map((c) => <Cell key={c.category} fill={COLORS[c.category]} />)}
                    </Pie><Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </>
  )
}
