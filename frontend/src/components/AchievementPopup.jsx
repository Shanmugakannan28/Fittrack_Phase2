import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api.js'

export default function AchievementPopup() {
  const [badges, setBadges] = useState([])
  const loc = useLocation()

  const check = useCallback(() => {
    api('/badges/unseen').then((b) => b.length && setBadges(b)).catch(() => {})
  }, [])

  useEffect(() => { check() }, [check, loc.pathname])
  useEffect(() => {
    window.addEventListener('fittrack:changed', check)
    return () => window.removeEventListener('fittrack:changed', check)
  }, [check])

  if (!badges.length) return null
  const close = async () => { setBadges([]); await api('/badges/seen', { method: 'POST' }).catch(() => {}) }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Achievement unlocked" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{badges.length > 1 ? 'Achievements unlocked' : 'Achievement unlocked'}</h2>
        {badges.map((b) => (
          <div className="pop-badge" key={b.id}>
            <span className="pop-icon">{b.icon}</span>
            <div><b>{b.name}</b><br /><span className="muted">{b.description}</span></div>
          </div>
        ))}
        <button className="btn" autoFocus onClick={close}>Keep going</button>
      </div>
    </div>
  )
}
