import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'

export default function Notifications() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => api('/notifications').then(setItems).catch((e) => setError(e.message)), [])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { try { await fn(); load() } catch (e) { setError(e.message) } }
  const clean = (m) => m.replace(/^\[#\d+\]\s*/, '')

  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        {items?.some((n) => !n.is_read) && <button className="btn ghost" onClick={() => act(() => api('/notifications/read-all', { method: 'POST' }))}>Mark all read</button>}
      </div>
      {error && <div className="alert">{error}</div>}
      {items?.length === 0 && <p className="empty">Nothing here yet. Reminders and goal alerts will show up here.</p>}
      <div className="card">
        {items?.map((n) => (
          <div key={n.id} className={`note wide ${n.is_read ? '' : 'unread'}`}>
            <div><b>{n.title}</b><span>{clean(n.message)}</span><small className="muted">{new Date(n.created_at).toLocaleString()}</small></div>
            <div className="inline">
              {!n.is_read && <button className="link" onClick={() => act(() => api(`/notifications/${n.id}/read`, { method: 'PATCH' }))}>Mark read</button>}
              <button className="link danger" onClick={() => act(() => api(`/notifications/${n.id}`, { method: 'DELETE' }))}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
