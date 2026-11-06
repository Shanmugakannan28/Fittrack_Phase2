import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Register() {
  const { register, login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await register(form.username, form.email, form.password)
      await login(form.email, form.password)
      nav('/')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="auth">
      <div className="auth-art"><h1>FitTrack</h1><p>Your workouts, goals and progress in one place.</p></div>
      <form className="auth-card" onSubmit={submit}>
        <h2>Create account</h2>
        {error && <div className="alert">{error}</div>}
        <label>Username<input required minLength={3} maxLength={30} value={form.username} onChange={set('username')} autoComplete="username" /></label>
        <label>Email<input type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} maxLength={72} value={form.password} onChange={set('password')} autoComplete="new-password" />
          <small className="muted">At least 8 characters</small></label>
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
