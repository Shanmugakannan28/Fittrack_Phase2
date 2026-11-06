const BASE = '/api'
const KEY = 'fittrack_token'

export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
}

export const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    tokenStore.clear()
    window.dispatchEvent(new Event('fittrack:logout'))
  }
  if (method !== 'GET' && res.ok) setTimeout(() => window.dispatchEvent(new Event('fittrack:changed')), 0)
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    let msg = 'Something went wrong. Please try again.'
    if (typeof data?.detail === 'string') msg = data.detail
    else if (Array.isArray(data?.detail)) msg = data.detail.map((d) => `${d.loc.slice(1).join('.')}: ${d.msg}`).join('; ')
    throw new Error(msg)
  }
  return data
}
