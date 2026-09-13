/**
 * FileTransferBar.jsx
 * Slide-up notification bar for incoming file offers and active transfers.
 * Listens for FILE_OFFER, FILE_CHUNK, FILE_COMPLETE events from wsClient.
 *
 * Fixes applied:
 *  - handleAccept/handleReject now send `to: transfer.from` so the proxy can route correctly.
 *  - Chunk binary data is stored in a ref (not React state) to avoid giant re-renders.
 *  - FILE_COMPLETE assembles all chunks into a Blob and triggers a real browser download.
 */
import { useEffect, useRef, useState } from 'react'
import wsClient, { WS_EVENT } from '../services/wsClient'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const STATUS = Object.freeze({
  PENDING:  'PENDING',  // Offer received, awaiting response
  ACTIVE:   'ACTIVE',   // Accepted, chunks arriving
  COMPLETE: 'COMPLETE', // Done
  REJECTED: 'REJECTED', // User rejected
})

export default function FileTransferBar() {
  const [transfers, setTransfers] = useState([])

  // Store raw chunk data outside of React state to avoid massive re-renders.
  // Structure: { [transferId]: { [chunkIndex]: Uint8Array } }
  const chunkDataRef = useRef({})

  useEffect(() => {
    // New file offer from a peer
    const unsubOffer = wsClient.on(WS_EVENT.FILE_OFFER, ({ from, name, size, mimeType, transferId }) => {
      chunkDataRef.current[transferId] = {}
      setTransfers((prev) => [
        ...prev,
        { transferId, from, name, size, fileType: mimeType || 'application/octet-stream', status: STATUS.PENDING, progress: 0, totalChunks: 0 },
      ])
    })

    // Chunk arriving — store binary data in ref, update progress in state
    const unsubChunk = wsClient.on(WS_EVENT.FILE_CHUNK, ({ transferId, chunkIndex, totalChunks, data }) => {
      // Decode base64 -> Uint8Array and store in the ref (no re-render cost)
      if (chunkDataRef.current[transferId] !== undefined) {
        try {
          const binary = atob(data)
          const bytes = new Uint8Array(binary.length)
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
          chunkDataRef.current[transferId][chunkIndex] = bytes
        } catch (err) {
          console.error(`[FileTransferBar] Failed to decode chunk ${chunkIndex}:`, err)
        }
      }

      setTransfers((prev) =>
        prev.map((t) =>
          t.transferId === transferId
            ? {
                ...t,
                status: STATUS.ACTIVE,
                totalChunks,
                // +1 so the final chunk shows 100%
                progress: totalChunks > 0 ? Math.round(((chunkIndex + 1) / totalChunks) * 100) : 0,
              }
            : t
        )
      )
    })

    // Transfer complete — assemble Blob and trigger download
    const unsubComplete = wsClient.on(WS_EVENT.FILE_COMPLETE, ({ transferId }) => {
      setTransfers((prev) => {
        const transfer = prev.find((t) => t.transferId === transferId)

        if (transfer) {
          const chunks = chunkDataRef.current[transferId] || {}
          const total = transfer.totalChunks

          try {
            // Assemble in order
            const orderedChunks = []
            for (let i = 0; i < total; i++) {
              if (chunks[i]) {
                orderedChunks.push(chunks[i])
              } else {
                console.error(`[FileTransferBar] Missing chunk ${i} for transfer ${transferId}`)
              }
            }

            const blob = new Blob(orderedChunks, { type: transfer.fileType })
            const url = URL.createObjectURL(blob)

            // Programmatic download
            const a = document.createElement('a')
            a.href = url
            a.download = transfer.name
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // Free memory
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          } catch (err) {
            console.error('[FileTransferBar] Failed to assemble file for download:', err)
          }

          // Clean up chunk data from memory
          delete chunkDataRef.current[transferId]
        }

        return prev.map((t) =>
          t.transferId === transferId ? { ...t, status: STATUS.COMPLETE, progress: 100 } : t
        )
      })

      // Auto-dismiss completed transfers after 4s
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

  // Bug fix: Pass `to: transfer.from` so the backend proxy knows where to route this.
  function handleAccept(transfer) {
    wsClient.send('FILE_ACCEPT', { transferId: transfer.transferId, to: transfer.from })
    setTransfers((prev) =>
      prev.map((t) => (t.transferId === transfer.transferId ? { ...t, status: STATUS.ACTIVE } : t))
    )
  }

  function handleReject(transfer) {
    wsClient.send('FILE_REJECT', { transferId: transfer.transferId, to: transfer.from })
    setTransfers((prev) => prev.filter((t) => t.transferId !== transfer.transferId))
    delete chunkDataRef.current[transfer.transferId]
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
              <span className="badge badge-online" style={{ flexShrink: 0 }}>Done ✓</span>
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
                onClick={() => handleAccept(t)}
              >
                Accept
              </button>
              <button
                id={`reject-${t.transferId}`}
                className="btn btn-danger btn-sm"
                style={{ flex: 1 }}
                onClick={() => handleReject(t)}
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
