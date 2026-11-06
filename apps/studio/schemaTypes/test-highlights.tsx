import {
  defineDecoration,
  useEditor,
  type Decoration,
  type DecorationMapping,
  type DecorationRegistration,
  type EditorSelection,
} from '@portabletext/editor'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import {
  getPublishedId,
  useDocumentOperation,
  useFormValue,
  type PortableTextPluginsProps,
} from 'sanity'

type Range = NonNullable<EditorSelection>

/** One item of the article's `testHighlights` field. */
export type StoredHighlight = {
  _key: string
  _type?: string
  color: string
  /** JSON-encoded editor range, relative to the `body` field. */
  range: string
}

type LogEntry = {at: string; text: string}

const COLORS = ['#ffe58a', '#a7f3d0', '#bfdbfe', '#fbcfe8', '#fed7aa']
const EMPTY: Array<StoredHighlight> = []

function parseRange(stored: StoredHighlight): Range | undefined {
  try {
    const range = JSON.parse(stored.range) as Range
    return range?.anchor && range?.focus ? range : undefined
  } catch {
    return undefined
  }
}

function itemPath(key: string) {
  return `testHighlights[_key=="${key}"]`
}

/**
 * Manual multiplayer test bed for registered decorations, with the
 * highlights saved in the document (`testHighlights`), the way comments
 * store their anchors outside the text.
 *
 * - "Highlight selection" adds an item; every editor on the document
 *   renders it.
 * - Each editor maps the highlights through every edit itself. Only the
 *   editor that made an edit (`origin: 'local'`) writes the mapped ranges
 *   back, once per change, so two editors never fight over a range.
 * - When the stored value changes (another editor wrote), the registration
 *   is updated from it.
 */
export function TestHighlightsPlugin(
  props: PortableTextPluginsProps,
): ReactNode {
  const editor = useEditor()
  const documentId = useFormValue(['_id']) as string | undefined
  const documentType = useFormValue(['_type']) as string | undefined
  const stored =
    (useFormValue(['testHighlights']) as Array<StoredHighlight> | undefined) ??
    EMPTY
  const {patch} = useDocumentOperation(
    getPublishedId(documentId ?? ''),
    documentType ?? 'article',
  )

  const registrationRef = useRef<DecorationRegistration | null>(null)
  const storedRef = useRef(stored)
  storedRef.current = stored
  const patchRef = useRef(patch)
  patchRef.current = patch
  const pendingWriteRef = useRef<Map<string, Range | null> | null>(null)
  const [log, setLog] = useState<Array<LogEntry>>([])

  function toDecorations(list: Array<StoredHighlight>): Array<Decoration> {
    return list.flatMap((item) => {
      const range = parseRange(item)
      if (!range) return []
      return [
        defineDecoration({
          id: item._key,
          type: 'range',
          range,
          render: ({children}) => (
            <span
              style={{background: item.color}}
              data-test-highlight={item._key}
            >
              {children}
            </span>
          ),
        }),
      ]
    })
  }

  function addLog(entries: Array<string>) {
    if (entries.length === 0) return
    const at = new Date().toLocaleTimeString()
    setLog((prev) =>
      [...entries.map((text) => ({at, text})).reverse(), ...prev].slice(0, 30),
    )
  }

  // Write the ranges this editor mapped through its own edit, once per
  // change (onMapped fires per operation, mid-apply).
  function flushWrites() {
    const pending = pendingWriteRef.current
    pendingWriteRef.current = null
    const registration = registrationRef.current
    if (!pending || !registration) return

    const live = new Map(
      registration.getDecorations().map((d) => [d.id, d.range]),
    )
    const storedKeys = new Set(storedRef.current.map((item) => item._key))
    const patches: Array<Record<string, unknown>> = []
    const lines: Array<string> = []

    for (const key of pending.keys()) {
      if (!storedKeys.has(key)) continue
      const range = live.get(key)
      if (range) {
        patches.push({set: {[`${itemPath(key)}.range`]: JSON.stringify(range)}})
        lines.push(`${key} saved moved range`)
      } else {
        patches.push({unset: [itemPath(key)]})
        lines.push(`${key} removed (its text was deleted)`)
      }
    }

    if (patches.length > 0) {
      patchRef.current.execute(patches)
      addLog(lines)
    }
  }

  useEffect(() => {
    const registration = editor.registerDecorations({
      decorations: toDecorations(storedRef.current),
      onMapped: (mappings: Array<DecorationMapping>) => {
        const lines: Array<string> = []
        for (const mapping of mappings) {
          if (mapping.newRange === null) {
            lines.push(`${mapping.id} died (${mapping.origin} edit)`)
          } else if (mapping.contentTouched) {
            lines.push(`${mapping.id} content touched (${mapping.origin} edit)`)
          }
          if (mapping.origin !== 'local') continue
          if (!pendingWriteRef.current) {
            pendingWriteRef.current = new Map()
            // Deferred: never patch or set state from inside onMapped.
            setTimeout(flushWrites, 0)
          }
          pendingWriteRef.current.set(mapping.id, mapping.newRange)
        }
        if (lines.length > 0) {
          queueMicrotask(() => addLog(lines))
        }
      },
    })
    registrationRef.current = registration
    return () => {
      registration.unregister()
      registrationRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Remote (or our own echoed) writes: reconcile by id. `update` only
  // adopts a range when it differs from the one previously given for that
  // id, and keeps live positions otherwise.
  useEffect(() => {
    registrationRef.current?.update(toDecorations(stored))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored])

  function addHighlight() {
    const selection = editor.getSnapshot().context.selection
    if (!selection) return
    const key = `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
    patch.execute([
      {setIfMissing: {testHighlights: []}},
      {
        insert: {
          after: 'testHighlights[-1]',
          items: [
            {
              _key: key,
              _type: 'testHighlight',
              color: COLORS[storedRef.current.length % COLORS.length],
              range: JSON.stringify(selection),
            },
          ],
        },
      },
    ])
    addLog([`${key} added`])
  }

  function clearHighlights() {
    patch.execute([{unset: ['testHighlights']}])
    setLog([])
  }

  const keepFocus = (event: MouseEvent) => event.preventDefault()
  const disabled = !documentId || Boolean(patch.disabled)

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: '6px 0',
          fontSize: 12,
          fontFamily: 'sans-serif',
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={addHighlight}
        >
          Highlight selection
        </button>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={clearHighlights}
        >
          Clear all
        </button>
        <span>
          {stored.length} shared highlight(s), saved in the document
          {patch.disabled ? ` (read-only: ${String(patch.disabled)})` : ''}
        </span>
      </div>
      {props.renderDefault(props)}
      {log.length > 0 && (
        <ul
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            margin: '6px 0',
            paddingLeft: 16,
          }}
        >
          {log.map((entry, i) => (
            <li key={i}>
              {entry.at} {entry.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
