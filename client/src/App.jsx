/**
 * App.jsx — LocalLink Main Application
 *
 * Three-panel layout:
 *   [TopBar] — app logo + ConnectionStatus
 *   [PeerList sidebar] | [ChatWindow]
 *   [FileTransferBar] — floats over the chat area
 *
 * Manages top-level state including:
 *  - activePeer: the currently open chat
 *  - unreadCounts: { [peerId]: number } — unread message badge counts (WhatsApp style)
 */
import { useEffect, useRef, useState } from 'react'
import './App.css'

import wsClient, { WS_EVENT } from './services/wsClient'
import ConnectionStatus from './components/ConnectionStatus'
import PeerList from './components/PeerList'
import ChatWindow from './components/ChatWindow'
import FileTransferBar from './components/FileTransferBar'

export default function App() {
  const [activePeer, setActivePeer] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState({}) // { [peerId]: count }

  // Ref so the wsClient listener always sees the latest activePeer
  // without needing to re-register the listener every time it changes.
  const activePeerRef = useRef(activePeer)
  useEffect(() => { activePeerRef.current = activePeer }, [activePeer])

  // Connect to local backend proxy on mount; disconnect cleanly on unmount
  useEffect(() => {
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [])

  // Track unread counts — increment when a message arrives for a non-active peer
  useEffect(() => {
    const unsub = wsClient.on(WS_EVENT.CHAT_MESSAGE, ({ from }) => {
      if (activePeerRef.current?.id !== from) {
        setUnreadCounts((prev) => ({ ...prev, [from]: (prev[from] || 0) + 1 }))
      }
    })
    return unsub
  }, [])

  // When user selects a peer, clear their unread badge
  function handleSelectPeer(peer) {
    setActivePeer(peer)
    setUnreadCounts((prev) => ({ ...prev, [peer.id]: 0 }))
  }

  return (
    <div
      id="app-root"
      className="dot-grid"
      style={{
        flex: 1,
        backgroundColor: 'var(--color-bg-base)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Decorative ambient glow blobs */}
      <div className="glow-blob glow-blob-accent" style={{ position: 'fixed', width: 500, height: 500, top: -150, left: -150, zIndex: 0 }} />
      <div className="glow-blob glow-blob-cyan" style={{ position: 'fixed', width: 350, height: 350, bottom: -80, right: -80, zIndex: 0 }} />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        id="topbar"
        className="glass-strong flex-between"
        style={{ padding: '0 24px', height: 56, flexShrink: 0, position: 'relative', zIndex: 10 }}
      >
        <div className="flex-center gap-2">
          <div
            id="app-logo"
            style={{
              width: 28, height: 28,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-cyan) 100%)',
              boxShadow: 'var(--shadow-glow-sm)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
            LocalLink
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>LAN</span>
        </div>

        <div className="flex-center gap-2">
          <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>E2EE</span>
          <ConnectionStatus />
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────── */}
      <main id="main-content" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <PeerList
          activeChat={activePeer?.id ?? null}
          onSelectPeer={handleSelectPeer}
          unreadCounts={unreadCounts}
        />

        <ChatWindow activePeer={activePeer} />

        <FileTransferBar />
      </main>
    </div>
  )
}
