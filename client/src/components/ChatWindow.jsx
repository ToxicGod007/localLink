/**
 * ChatWindow.jsx
 * Main chat area. Displays messages for the active peer conversation,
 * auto-scrolls to latest, and provides a message input bar.
 */
import { useEffect, useRef, useState } from 'react'
import wsClient, { WS_EVENT } from '../services/wsClient'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

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

function TypingBubble() {
  return (
    <div className="animate-slide-in-left" style={{ display: 'flex', padding: '2px 0', alignItems: 'flex-start', gap: 8 }}>
      <div style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        display: 'flex', gap: 4, alignItems: 'center'
      }}>
        <span className="typing-dot animate-bounce-soft" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-muted)', animationDelay: '0ms' }} />
        <span className="typing-dot animate-bounce-soft" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-muted)', animationDelay: '150ms' }} />
        <span className="typing-dot animate-bounce-soft" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-muted)', animationDelay: '300ms' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>is typing...</span>
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
  const [typingPeers, setTypingPeers] = useState(new Set())
  
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const peerId = activePeer?.id
  const peerMessages = (peerId && messages[peerId]) || []
  const isPeerTyping = peerId && typingPeers.has(peerId)

  // 1. Load chats from local storage
  useEffect(() => {
    const saved = localStorage.getItem('locallink_chats')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch (err) {
        console.error('Failed to parse chats from local storage', err)
      }
    }
  }, [])

  // 2. Save chats to local storage
  useEffect(() => {
    if (Object.keys(messages).length > 0) {
      localStorage.setItem('locallink_chats', JSON.stringify(messages))
    }
  }, [messages])

  // Scroll to bottom whenever messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [peerMessages, isPeerTyping])

  // Listen for incoming chat messages and typing events
  useEffect(() => {
    const unsubChat = wsClient.on(WS_EVENT.CHAT_MESSAGE, (payload) => {
      const { from, text, ts } = payload
      setMessages((prev) => ({
        ...prev,
        [from]: [...(prev[from] || []), { from, text, ts: ts ?? Date.now(), id: `${from}-${ts}` }],
      }))
    })

    const unsubTypingStart = wsClient.on(WS_EVENT.TYPING_START, ({ from }) => {
      setTypingPeers((prev) => {
        const next = new Set(prev)
        next.add(from)
        return next
      })
    })

    const unsubTypingStop = wsClient.on(WS_EVENT.TYPING_STOP, ({ from }) => {
      setTypingPeers((prev) => {
        const next = new Set(prev)
        next.delete(from)
        return next
      })
    })

    // Listen for incoming FILE_OFFER — add a message bubble in chat so the
    // receiver can see the file name and size in their chat history.
    const unsubFileOffer = wsClient.on(WS_EVENT.FILE_OFFER, ({ from, name, size, transferId }) => {
      setMessages((prev) => ({
        ...prev,
        [from]: [
          ...(prev[from] || []),
          {
            from,
            text: `📎 ${name}  ·  ${formatBytes(size)}`,
            ts: Date.now(),
            id: `file-offer-${transferId}`,
          },
        ],
      }))
    })

    return () => {
      unsubChat()
      unsubTypingStart()
      unsubTypingStop()
      unsubFileOffer()
    }
  }, [])

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    if (!peerId) return

    wsClient.send('TYPING_START', { to: peerId })
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    typingTimeoutRef.current = setTimeout(() => {
      wsClient.send('TYPING_STOP', { to: peerId })
    }, 2000)
  }

  function handleSend() {
    const text = inputValue.trim()
    if (!text || !peerId) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      wsClient.send('TYPING_STOP', { to: peerId })
    }

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

  // --- FILE TRANSFER LOGIC ---
  function triggerFileSelect() {
    fileInputRef.current?.click()
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !peerId) return
    e.target.value = '' // reset input

    const transferId = `tx-${Date.now()}`
    
    // 1. Send Offer
    wsClient.send('FILE_OFFER', {
      to: peerId,
      transferId,
      name: file.name,
      size: file.size,
      mimeType: file.type  // Note: named 'mimeType' to avoid colliding with wsClient's own 'type' field
    })

    // Add a local message indicating we are waiting
    const msgId = `me-${Date.now()}`
    setMessages((prev) => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), { from: 'me', to: peerId, text: `📎 Offering file: ${file.name} (Waiting for accept...)`, ts: Date.now(), id: msgId }],
    }))

    // Helper to update the message text
    const updateProgressMsg = (text) => {
      setMessages((prev) => {
        const peerMsgs = prev[peerId] || []
        return {
          ...prev,
          [peerId]: peerMsgs.map(m => m.id === msgId ? { ...m, text } : m)
        }
      })
    }

    // 2. Await Acceptance
    const isAccepted = await new Promise((resolve) => {
      const handleAccept = (payload) => {
        if (payload.transferId === transferId) {
          cleanup()
          resolve(true)
        }
      }
      const handleReject = (payload) => {
        if (payload.transferId === transferId) {
          cleanup()
          resolve(false)
        }
      }
      
      const unsubAccept = wsClient.on(WS_EVENT.FILE_ACCEPT, handleAccept)
      const unsubReject = wsClient.on(WS_EVENT.FILE_REJECT, handleReject)

      function cleanup() {
        unsubAccept()
        unsubReject()
      }
    })

    if (!isAccepted) {
      updateProgressMsg(`❌ Transfer rejected: ${file.name}`)
      return
    }

    updateProgressMsg(`📎 Sending file: ${file.name} (0%)`)

    // 3. Stream Chunks securely using File.slice
    const CHUNK_SIZE = 256 * 1024 // 256KB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)
      
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsArrayBuffer(blob)
      })
      
      let binary = ''
      const bytes = new Uint8Array(arrayBuffer)
      const len = bytes.byteLength
      for (let j = 0; j < len; j++) {
        binary += String.fromCharCode(bytes[j])
      }
      const base64Chunk = btoa(binary)

      wsClient.send('FILE_CHUNK', {
        to: peerId,
        transferId,
        chunkIndex: i,
        totalChunks,
        data: base64Chunk
      })

      const percent = Math.round(((i + 1) / totalChunks) * 100)
      updateProgressMsg(`📎 Sending file: ${file.name} (${percent}%)`)
    }
    
    // 4. Complete
    wsClient.send('FILE_COMPLETE', { to: peerId, transferId })
    updateProgressMsg(`✅ Sent file: ${file.name}`)
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
        {isPeerTyping && <TypingBubble />}
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
          {/* Hidden File Input */}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
          
          {/* Attachment Button */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={triggerFileSelect}
            title="Attach file"
            style={{ flexShrink: 0, width: 42, height: 42, color: 'var(--color-text-muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <textarea
            id="message-input"
            className="input"
            placeholder={`Message ${activePeer.name}…`}
            value={inputValue}
            onChange={handleInputChange}
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
