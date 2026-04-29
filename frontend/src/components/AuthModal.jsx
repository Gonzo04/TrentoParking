import { useState } from 'react'
import { api } from '../services/api'

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form)
      localStorage.setItem('token', data.token)
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <button style={styles.close} onClick={onClose}>✕</button>

        <h2 style={{ margin: '0 0 20px' }}>
          {mode === 'login' ? 'Accedi' : 'Registrati'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <>
              <input placeholder="Nome"    value={form.nome}    onChange={set('nome')}    required />
              <input placeholder="Cognome" value={form.cognome} onChange={set('cognome')} required />
            </>
          )}
          <input type="email"    placeholder="Email"    value={form.email}    onChange={set('email')}    required />
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />

          {error && <p style={{ color: 'red', margin: 0, fontSize: 14 }}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? 'Caricamento...' : (mode === 'login' ? 'Accedi' : 'Registrati')}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          {mode === 'login' ? 'Non hai un account? ' : 'Hai già un account? '}
          <button
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? 'Registrati' : 'Accedi'}
          </button>
        </p>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  card: {
    background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 400,
    position: 'relative',
  },
  close: {
    position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
    fontSize: 18, cursor: 'pointer', color: '#6b7280',
  },
  btnPrimary: {
    padding: '10px 0', background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
}
