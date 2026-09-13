/**
 * ChatWindow.jsx
 * Main chat area. Displays messages for the active peer conversation,
 * auto-scrolls to latest, and provides a message input bar.
 */
import { useEffect, useRef, useState } from 'react'
import wsClient, { WS_EVENT } from '../services/wsClient'

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MessageBubble({ msg, isMine }) {
  return (
    <div
      className={isMine ? 'animate-slide-in-right' : 'animate-slide-in-left'}
      style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        padding: '2px 0',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '9px 13px',
          borderRadius: isMine
            ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
          background: isMine
            ? 'var(--color-accent)'
            : 'var(--color-bg-elevated)',
          border: isMine
            ? 'none'
            : '1px solid var(--color-border)',
          boxShadow: isMine ? 'var(--shadow-glow-sm)' : 'var(--shadow-sm)',
        }}
      >
        <p
          style={{
            fontSize: '0.9375rem',
            color: isMine ? '#fff' : 'var(--color-text-primary)',
            lineHeight: 1.5,
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {msg.text}
        </p>
        <p
          style={{
            fontSize: '0.7rem',
            color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
            marginTop: 3,
            textAlign: 'right',
          }}
        >
          {formatTime(msg.ts)}
        </p>
      </div>
    </div>
  )
}

function EmptyChat({ peerName }) {
  return (
    <div
      id="empty-chat"
      className="flex-center flex-col gap-3"
      style={{ flex: 1 }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-accent-dim)',
          border: '1px solid rgba(99,102,241,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-accent-light)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          className="animate-bounce-soft"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '0.95rem', marginBottom: 4 }}>
          {peerName ? `Chat with ${peerName}` : 'Select a peer'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {peerName
            ? 'No messages yet. Say hello!'
            : 'Choose a peer from the sidebar to start chatting.'}
        </p>
      </div>
    </div>
  )
}

export default function ChatWindow({ activePeer }) {
  const [messages, setMessages] = useState({}) // { [peerId]: Message[] }
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef(null)

  const peerId = activePeer?.id
  const peerMessages = (peerId && messages[peerId]) || []

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [peerMessages])

  // Listen for incoming chat messages
  useEffect(() => {
    const unsub = wsClient.on(WS_EVENT.CHAT_MESSAGE, (payload) => {
      const { from, text, ts } = payload
      setMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { from, text, ts: ts ?? Date.now(), id: `${from}-${ts}` }],
      }))
    })
    return unsub
  }, [])

  function handleSend() {
    const text = inputValue.trim()
    if (!text || !peerId) return

    const msg = { from: 'me', to: peerId, text, ts: Date.now(), id: `me-${Date.now()}` }

    // Optimistically add to local state
    setMessages((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), msg],
    }))

    // Send to backend proxy
    wsClient.send('CHAT_MESSAGE', { to: peerId, text })
    setInputValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <section
      id="chat-area"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--color-bg-base)',
      }}
    >
      {/* Chat header */}
      {activePeer && (
        <div
          id="chat-header"
          className="glass flex-between"
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div className="flex-center gap-2">
            <span
              className="status-dot online animate-pulse-ring"
              style={{ display: 'inline-block' }}
            />
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{activePeer.name}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {activePeer.ip}
            </span>
          </div>
          <span className="badge badge-accent">E2EE</span>
        </div>
      )}

      {/* Message list */}
      <div
        id="message-list"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {peerMessages.length === 0 ? (
          <EmptyChat peerName={activePeer?.name} />
        ) : (
          peerMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMine={msg.from === 'me'} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {activePeer && (
        <div
          id="message-input-bar"
          className="glass"
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            flexShrink: 0,
          }}
        >
          <textarea
            id="message-input"
            className="input"
            placeholder={`Message ${activePeer.name}…`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{
              resize: 'none',
              minHeight: 42,
              maxHeight: 120,
              lineHeight: 1.5,
              overflowY: 'auto',
            }}
          />
          <button
            id="send-button"
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            title="Send (Enter)"
            style={{ flexShrink: 0, width: 42, height: 42 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
    </section>
  )
}
