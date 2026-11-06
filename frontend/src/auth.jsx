import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, tokenStore } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])

  useEffect(() => {
    if (!tokenStore.get()) return
    api('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    window.addEventListener('fittrack:logout', logout)
    return () => window.removeEventListener('fittrack:logout', logout)
  }, [logout])

  const login = async (email, password) => {
    const res = await api('/auth/login', { method: 'POST', body: { email, password } })
    tokenStore.set(res.access_token)
    setUser(res.user)
  }
  const register = (username, email, password) =>
    api('/auth/register', { method: 'POST', body: { username, email, password } })

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
