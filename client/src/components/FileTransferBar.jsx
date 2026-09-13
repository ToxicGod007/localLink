/**
 * FileTransferBar.jsx
 * Slide-up notification bar for incoming file offers and active transfers.
 * Listens for FILE_OFFER, FILE_CHUNK, FILE_COMPLETE events from wsClient.
 */
import { useEffect, useState } from 'react'
import wsClient, { WS_EVENT } from '../services/wsClient'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const STATUS = Object.freeze({
  PENDING:    'PENDING',    // Offer received, awaiting response
  ACTIVE:     'ACTIVE',     // Accepted, chunks arriving
  COMPLETE:   'COMPLETE',   // Done
  REJECTED:   'REJECTED',   // User rejected
})

export default function FileTransferBar() {
  const [transfers, setTransfers] = useState([])

  useEffect(() => {
    // New file offer from a peer
    const unsubOffer = wsClient.on(WS_EVENT.FILE_OFFER, ({ from, name, size, transferId }) => {
      setTransfers((prev) => [
        ...prev,
        { transferId, from, name, size, status: STATUS.PENDING, progress: 0, chunkIndex: 0, totalChunks: 0 },
      ])
    })

    // Chunk progress update
    const unsubChunk = wsClient.on(WS_EVENT.FILE_CHUNK, ({ transferId, chunkIndex, totalChunks }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.transferId === transferId
            ? {
                ...t,
                status: STATUS.ACTIVE,
                chunkIndex,
                totalChunks,
                progress: totalChunks > 0 ? Math.round((chunkIndex / totalChunks) * 100) : 0,
              }
            : t
        )
      )
    })

    // Transfer complete
    const unsubComplete = wsClient.on(WS_EVENT.FILE_COMPLETE, ({ transferId }) => {
      setTransfers((prev) =>
        prev.map((t) =>
          t.transferId === transferId
            ? { ...t, status: STATUS.COMPLETE, progress: 100 }
            : t
        )
      )
      // Auto-dismiss completed transfers after 4 s
      setTimeout(() => {
        setTransfers((prev) => prev.filter((t) => t.transferId !== transferId))
      }, 4000)
    })

    return () => {
      unsubOffer()
      unsubChunk()
      unsubComplete()
    }
  }, [])

  function handleAccept(transferId) {
    wsClient.send('FILE_ACCEPT', { transferId })
    setTransfers((prev) =>
      prev.map((t) => (t.transferId === transferId ? { ...t, status: STATUS.ACTIVE } : t))
    )
  }

  function handleReject(transferId) {
    wsClient.send('FILE_REJECT', { transferId })
    setTransfers((prev) => prev.filter((t) => t.transferId !== transferId))
  }

  if (transfers.length === 0) return null

  return (
    <div
      id="file-transfer-bar"
      className="animate-slide-in-up"
      style={{
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 100,
      }}
    >
      {transfers.map((t) => (
        <div
          key={t.transferId}
          id={`transfer-${t.transferId}`}
          className="glass-strong"
          style={{
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* File info row */}
          <div className="flex-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              {/* File icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent-dim)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-accent-light)" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 180,
                  }}
                >
                  {t.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {formatBytes(t.size)} &middot; from {t.from}
                </div>
              </div>
            </div>

            {/* Status badge */}
            {t.status === STATUS.COMPLETE && (
              <span className="badge badge-online" style={{ flexShrink: 0 }}>Done</span>
            )}
            {t.status === STATUS.ACTIVE && (
              <span className="badge badge-accent" style={{ flexShrink: 0 }}>{t.progress}%</span>
            )}
          </div>

          {/* Progress bar (shown when active or complete) */}
          {(t.status === STATUS.ACTIVE || t.status === STATUS.COMPLETE) && (
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${t.progress}%` }} />
            </div>
          )}

          {/* Action buttons (shown only when pending) */}
          {t.status === STATUS.PENDING && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id={`accept-${t.transferId}`}
                className="btn btn-success btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleAccept(t.transferId)}
              >
                Accept
              </button>
              <button
                id={`reject-${t.transferId}`}
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleReject(t.transferId)}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
