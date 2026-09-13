/**
 * App.jsx — LocalLink Main Application
 *
 * Three-panel layout:
 *   [TopBar] — app logo + ConnectionStatus
 *   [PeerList sidebar] | [ChatWindow]
 *   [FileTransferBar] — floats over the chat area
 *
 * Initialises the wsClient singleton on mount and manages top-level state.
 */
import { useEffect, useState } from 'react'
import './App.css'

import wsClient from './services/wsClient'
import ConnectionStatus from './components/ConnectionStatus'
import PeerList from './components/PeerList'
import ChatWindow from './components/ChatWindow'
import FileTransferBar from './components/FileTransferBar'

export default function App() {
  const [activePeer, setActivePeer] = useState(null)

  // Connect to local backend proxy on mount; disconnect cleanly on unmount
  useEffect(() => {
    wsClient.connect()
    return () => wsClient.disconnect()
  }, [])

  return (
    <div
      id="app-root"
      className="dot-grid"
      style={{
        flex: 1,                   /* fills #root which is already 100% height */
        backgroundColor: 'var(--color-bg-base)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Decorative ambient glow blobs — position:fixed keeps them out of the flex layout */}
      <div
        className="glow-blob glow-blob-accent"
        style={{ position: 'fixed', width: 500, height: 500, top: -150, left: -150, zIndex: 0 }}
      />
      <div
        className="glow-blob glow-blob-cyan"
        style={{ position: 'fixed', width: 350, height: 350, bottom: -80, right: -80, zIndex: 0 }}
      />

      {/* ── Top bar ────────────────────────────────────────────── */}
      <header
        id="topbar"
        className="glass-strong flex-between"
        style={{
          padding: '0 24px',
          height: 56,
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo + wordmark */}
        <div className="flex-center gap-2">
          <div
            id="app-logo"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-cyan) 100%)',
              boxShadow: 'var(--shadow-glow-sm)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--color-text-primary)',
            }}
          >
            LocalLink
          </span>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
            LAN
          </span>
        </div>

        {/* Right side: E2EE badge + connection status */}
        <div className="flex-center gap-2">
          <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
            E2EE
          </span>
          <ConnectionStatus />
        </div>
      </header>

      {/* ── Main area ──────────────────────────────────────────── */}
      <main
        id="main-content"
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Peer list sidebar */}
        <PeerList
          activeChat={activePeer?.id ?? null}
          onSelectPeer={setActivePeer}
        />

        {/* Chat window */}
        <ChatWindow activePeer={activePeer} />

        {/* File transfer overlay (floats in bottom-right of main) */}
        <FileTransferBar />
      </main>
    </div>
  )
}
