import {
  hybridDebugLog,
  onHybridDebug,
  type HybridDebugEntry,
} from '@portabletext/editor/hybrid-debug'
import {useEffect, useState} from 'react'

export function HybridDebugPanel() {
  const [entries, setEntries] = useState<HybridDebugEntry[]>([])

  useEffect(() => {
    return onHybridDebug(() => {
      setEntries([...hybridDebugLog])
    })
  }, [])

  if (entries.length === 0) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: '40vh',
        overflow: 'auto',
        background: '#1a1a2e',
        color: '#e0e0e0',
        fontFamily: 'monospace',
        fontSize: '11px',
        padding: '8px',
        borderTop: '2px solid #e94560',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <strong style={{color: '#e94560'}}>Hybrid Input Debug</strong>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            type="button"
            onClick={() => {
              const text = entries
                .map(
                  (entry) =>
                    `${new Date(entry.timestamp).toLocaleTimeString()} ${entry.cancelable ? '✓cancel' : '✗cancel'} ${entry.inputType} → ${entry.path}${entry.detail ? ` — ${entry.detail}` : ''}`,
                )
                .join('\n')
              navigator.clipboard.writeText(text)
            }}
            style={{
              color: '#60a5fa',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              hybridDebugLog.length = 0
              setEntries([])
            }}
            style={{
              color: '#888',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
          >
            Clear
          </button>
        </div>
      </div>
      {entries.map((entry, entryIndex) => (
        <div
          key={`${entry.timestamp}-${entryIndex}`}
          style={{
            padding: '2px 0',
            borderBottom: '1px solid #333',
            color:
              entry.path === 'fast'
                ? '#4ade80'
                : entry.path === 'slow'
                  ? '#fbbf24'
                  : '#60a5fa',
          }}
        >
          <span style={{color: '#888'}}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>{' '}
          <span style={{color: entry.cancelable ? '#4ade80' : '#ef4444'}}>
            {entry.cancelable ? '\u2713cancel' : '\u2717cancel'}
          </span>{' '}
          <strong>{entry.inputType}</strong>
          {' \u2192 '}
          <span>{entry.path}</span>
          {entry.detail && (
            <span style={{color: '#888'}}> &mdash; {entry.detail}</span>
          )}
        </div>
      ))}
    </div>
  )
}
