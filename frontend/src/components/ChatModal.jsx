import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'

const POLL_MS = 4000

function senderName(mittente) {
  if (!mittente) return 'Utente'
  return [mittente.nome, mittente.cognome].filter(Boolean).join(' ') || mittente.nomeUtente || 'Utente'
}

const NAME_COLORS = ['#7c3aed', '#0369a1', '#b45309', '#15803d', '#be185d']
function nameColor(id) {
  if (!id) return '#4a5568'
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return NAME_COLORS[h % NAME_COLORS.length]
}

export default function ChatModal({ bookingId, currentUserId, onClose }) {
  const [messages, setMessages] = useState([])
  const [testo,    setTesto]    = useState('')
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState('')
  const bottomRef = useRef(null)

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    let active = true
    function fetchMessages() {
      api.getMessages(bookingId)
        .then(msgs => { if (active) setMessages(msgs) })
        .catch(() => {})
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, POLL_MS)
    return () => { active = false; clearInterval(interval) }
  }, [bookingId])

  useEffect(() => { scrollToBottom() }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!testo.trim()) return
    setSending(true)
    setError('')
    try {
      const msg = await api.sendMessage(bookingId, testo.trim())
      setMessages(prev => [...prev, msg])
      setTesto('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <span style={S.title}>💬 Chat prenotazione</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Messages */}
        <div style={S.body}>
          {messages.length === 0 && (
            <p style={S.empty}>Nessun messaggio ancora. Scrivi il primo!</p>
          )}
          {messages.map(msg => {
            const isMe = msg.mittente?._id === currentUserId || msg.mittente === currentUserId
            const senderId = msg.mittente?._id ?? msg.mittente
            return (
              <div key={msg._id} style={{ ...S.msgRow, justifyContent: isMe ? 'flex-start' : 'flex-end' }}>
                <div style={{ ...S.bubble, ...(isMe ? S.bubbleMe : S.bubbleOther) }}>
                  <span style={{ ...S.senderName, color: isMe ? 'rgba(255,255,255,0.75)' : nameColor(senderId) }}>
                    {senderName(msg.mittente)}
                  </span>
                  <p style={S.msgText}>{msg.testo}</p>
                  <span style={S.msgTime}>
                    {new Date(msg.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form style={S.inputArea} onSubmit={handleSend}>
          {error && <p style={S.errorMsg}>{error}</p>}
          <div style={S.inputRow}>
            <input
              style={S.input}
              value={testo}
              onChange={e => setTesto(e.target.value)}
              placeholder="Scrivi un messaggio…"
              maxLength={1000}
              disabled={sending}
              autoFocus
            />
            <button style={S.sendBtn} type="submit" disabled={sending || !testo.trim()}>
              {sending ? '…' : '➤'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480,
    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
    margin: '0 16px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #e5e7eb', flexShrink: 0,
  },
  title: { fontWeight: 700, fontSize: 15, color: '#003049' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, color: '#6b7280', lineHeight: 1,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 24 },
  msgRow: { display: 'flex' },
  bubble: {
    maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  bubbleMe: {
    background: '#2563eb', color: '#fff',
    borderBottomLeftRadius: 4,
  },
  bubbleOther: {
    background: '#f1f5f9', color: '#1e293b',
    borderBottomRightRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  msgText: { margin: 0, fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' },
  msgTime: { fontSize: 10, opacity: 0.7, alignSelf: 'flex-end', marginTop: 2 },
  inputArea: {
    padding: '10px 12px', borderTop: '1px solid #e5e7eb', flexShrink: 0,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  inputRow: { display: 'flex', gap: 8 },
  errorMsg: { margin: 0, fontSize: 12, color: '#dc2626' },
  input: {
    flex: 1, padding: '9px 12px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '9px 16px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 16, fontWeight: 700, flexShrink: 0,
  },
}
