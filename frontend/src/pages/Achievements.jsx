import { useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Achievements() {
  const [streak, setStreak] = useState(null)
  const [badges, setBadges] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/streak').then(setStreak).catch((e) => setError(e.message))
    api('/badges').then(setBadges).catch((e) => setError(e.message))
  }, [])

  const earned = badges?.filter((b) => b.earned).length ?? 0
  const note = !streak ? '' : streak.current_streak === 0
    ? 'No active streak. Log a workout today to start one.'
    : streak.at_risk ? 'Work out today to keep your streak alive!' : "You've worked out today. Streak secured."

  return (
    <>
      <div className="page-head"><h1>Streaks & badges</h1></div>
      {error && <div className="alert">{error}</div>}
      {streak && (
        <section className="card streak-hero">
          <div className="flame">🔥</div>
          <div><strong className="big">{streak.current_streak}</strong><span className="muted"> day streak</span><p>{note}</p></div>
          <div className="streak-side">
            <div><b>{streak.longest_streak}</b><span className="muted">Longest streak</span></div>
            <div><b>{streak.last_workout_date || '—'}</b><span className="muted">Last workout</span></div>
          </div>
        </section>
      )}
      <section>
        <h2>Badges <span className="muted">({earned} of {badges?.length ?? 0} earned)</span></h2>
        <div className="badge-grid">
          {badges?.map((b) => (
            <div key={b.id} className={`card badge ${b.earned ? 'earned' : 'locked'}`}>
              <span className="badge-icon" aria-hidden="true">{b.icon}</span>
              <b>{b.name}</b><span className="muted">{b.description}</span>
              <small>{b.earned ? `Earned ${new Date(b.earned_at).toLocaleDateString()}` : 'Locked'}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
