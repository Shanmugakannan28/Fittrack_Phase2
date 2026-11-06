import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api.js'

const METRICS = { calories: 'Calories', workouts: 'Workouts', minutes: 'Active minutes' }
const TREND = { improving: ['Improving', '▲'], declining: ['Slowing down', '▼'], steady: ['Steady', '■'], none: ['No data yet', '–'] }

export default function Compare() {
  const [mode, setMode] = useState('weekly')
  const [metric, setMetric] = useState('calories')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    api(mode === 'weekly' ? '/compare/weekly?weeks=8' : '/compare/monthly?months=6').then(setData).catch((e) => setError(e.message))
  }, [mode])

  const chg = (v) => (v === null ? 'new' : `${v > 0 ? '+' : ''}${v}%`)
  const cls = (v) => (v === null || v === 0 ? '' : v > 0 ? 'up' : 'down')

  return (
    <>
      <div className="page-head">
        <h1>Progress comparison</h1>
        <div className="seg">
          <button className={mode === 'weekly' ? 'on' : ''} onClick={() => setMode('weekly')}>Weekly</button>
          <button className={mode === 'monthly' ? 'on' : ''} onClick={() => setMode('monthly')}>Monthly</button>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <section className="cards">
            {Object.entries(METRICS).map(([k, label]) => (
              <div className="card stat" key={k}>
                <span className="muted">{label} this {data.unit}</span>
                <strong>{data.current[k]}</strong>
                <small className={`delta ${cls(data.change[k])}`}>{chg(data.change[k])} vs last {data.unit} ({data.previous[k]})</small>
              </div>
            ))}
            <div className={`card stat trend ${data.trend}`}>
              <span className="muted">Trend</span><strong>{TREND[data.trend][1]} <small>{TREND[data.trend][0]}</small></strong>
            </div>
          </section>

          <section className="card">
            <div className="between">
              <h2>{METRICS[metric]} by {data.unit}</h2>
              <div className="seg">{Object.entries(METRICS).map(([k, l]) => <button key={k} className={metric === k ? 'on' : ''} onClick={() => setMetric(k)}>{l}</button>)}</div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis width={44} tick={{ fontSize: 11 }} /><Tooltip />
                <Bar dataKey={metric} name={METRICS[metric]} radius={[3, 3, 0, 0]}>
                  {data.series.map((_, i) => <Cell key={i} fill={i === data.series.length - 1 ? 'var(--accent)' : '#8aa0b5'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <div className="grid2">
            <section className="card">
              <h2>Improvement trend</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis width={44} tick={{ fontSize: 11 }} /><Tooltip />
                  <Line type="monotone" dataKey={metric} name={METRICS[metric]} stroke="#2e8b73" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <section className="card">
              <h2>Insights</h2>
              <ul className="insights">{data.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </section>
          </div>
        </>
      )}
    </>
  )
}
