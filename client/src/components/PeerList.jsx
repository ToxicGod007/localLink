/**
 * PeerList.jsx
 * Left sidebar listing discovered LAN peers.
 * Peers arrive via PEER_ANNOUNCE / PEER_OFFLINE WebSocket events.
 */
import { useEffect, useState } from 'react'
import wsClient, { WS_EVENT } from '../services/wsClient'

function PeerAvatar({ name }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Deterministic hue from name
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  const hue = Math.abs(hash) % 360

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--radius-full)',
        background: `hsl(${hue} 60% 55%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: '0.05em',
      }}
    >
      {initials}
    </div>
  )
}

function PeerRow({ peer, isActive, onClick, unread }) {
  return (
    <button
      id={`peer-${peer.id}`}
      onClick={() => onClick(peer)}
      className="btn-ghost animate-slide-in-left"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        textAlign: 'left',
        background: isActive ? 'var(--color-accent-dim)' : 'transparent',
        border: isActive
          ? '1px solid rgba(99,102,241,0.25)'
          : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      <div style={{ position: 'relative' }}>
        <PeerAvatar name={peer.name} />
        <span
          className="status-dot online animate-pulse-ring"
          style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, border: '2px solid var(--color-bg-surface)' }}
        />
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {peer.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {peer.ip}
        </div>
      </div>
      {/* Unread badge — shown when there are unseen messages from this peer */}
      {unread > 0 && (
        <span
          style={{
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            flexShrink: 0,
            boxShadow: 'var(--shadow-glow-sm)',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

export default function PeerList({ activeChat, onSelectPeer, unreadCounts = {} }) {
  const [peers, setPeers] = useState([])

  useEffect(() => {
    const unsubAnnounce = wsClient.on(WS_EVENT.PEER_ANNOUNCE, ({ peer }) => {
      if (!peer) return
      setPeers((prev) => {
        const exists = prev.find((p) => p.id === peer.id)
        return exists ? prev.map((p) => (p.id === peer.id ? peer : p)) : [...prev, peer]
      })
    })

    const unsubOffline = wsClient.on(WS_EVENT.PEER_OFFLINE, ({ peerId }) => {
      setPeers((prev) => prev.filter((p) => p.id !== peerId))
    })

    return () => {
      unsubAnnounce()
      unsubOffline()
    }
  }, [])

  return (
    <aside
      id="peer-sidebar"
      className="glass flex-col"
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: '1px solid var(--color-border)',
        padding: '16px 10px',
        gap: 4,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex-between" style={{ padding: '0 4px', marginBottom: 8 }}>
        <p
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          Peers on LAN
        </p>
        {peers.length > 0 && (
          <span className="badge badge-online" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            {peers.length}
          </span>
        )}
      </div>

      {/* Peer rows */}
      {peers.length > 0 ? (
        peers.map((peer) => (
          <PeerRow
            key={peer.id}
            peer={peer}
            isActive={activeChat === peer.id}
            onClick={onSelectPeer}
            unread={unreadCounts[peer.id] || 0}
          />
        ))
      ) : (
        /* Discovery skeleton */
        <div className="flex-col gap-2" style={{ marginTop: 4 }}>
          {[75, 55, 85].map((w, i) => (
            <div
              key={i}
              className="flex-center gap-2"
              style={{ padding: '8px 10px', animationDelay: `${i * 80}ms` }}
            >
              <div
                className="skeleton"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  flexShrink: 0,
                }}
              />
              <div className="flex-col gap-1" style={{ flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ height: 10, width: `${w}%`, borderRadius: 'var(--radius-sm)' }}
                />
                <div
                  className="skeleton"
                  style={{ height: 8, width: '50%', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
          ))}
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Discovering peers…
          </p>
        </div>
      )}
    </aside>
  )
}
