import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const box = useRef(null)

  const refreshCount = useCallback(() => api('/notifications/unread-count').then((r) => setCount(r.count)).catch(() => {}), [])

  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, 60000)
    return () => clearInterval(t)
  }, [refreshCount])

  useEffect(() => {
    window.addEventListener('fittrack:changed', refreshCount)
    return () => window.removeEventListener('fittrack:changed', refreshCount)
  }, [refreshCount])

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next) setItems((await api('/notifications')).slice(0, 5))
  }
  const readAll = async () => {
    await api('/notifications/read-all', { method: 'POST' })
    setItems((x) => x.map((n) => ({ ...n, is_read: true })))
    setCount(0)
  }

  return (
    <div className="bell" ref={box}>
      <button className="btn ghost bell-btn" onClick={toggle} aria-label={`Notifications, ${count} unread`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {count > 0 && <span className="badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <strong>Notifications</strong>
            {count > 0 && <button className="link" onClick={readAll}>Mark all read</button>}
          </div>
          {items.length === 0 && <p className="muted pad">You're all caught up.</p>}
          {items.map((n) => (
            <div key={n.id} className={`note ${n.is_read ? '' : 'unread'}`}>
              <b>{n.title}</b>
              <span>{n.message.replace(/^\[#\d+\]\s*/, '')}</span>
            </div>
          ))}
          <Link className="dropdown-foot" to="/notifications" onClick={() => setOpen(false)}>See all notifications</Link>
        </div>
      )}
    </div>
  )
}
