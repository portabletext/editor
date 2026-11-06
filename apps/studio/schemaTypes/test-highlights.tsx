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
import type {PortableTextPluginsProps} from 'sanity'

type Highlight = {
  id: string
  range: NonNullable<EditorSelection>
  color: string
}
type LogEntry = {at: string; text: string}

const COLORS = ['#ffe58a', '#a7f3d0', '#bfdbfe', '#fbcfe8', '#fed7aa']

/**
 * Manual multiplayer test bed for registered decorations: per-browser
 * highlights (never persisted) that should follow a collaborator's remote
 * edits. Highlight a phrase in browser A, edit around/inside it in
 * browser B, watch A's highlight and the mapping log.
 */
export function TestHighlightsPlugin(
  props: PortableTextPluginsProps,
): ReactNode {
  const editor = useEditor()
  const registrationRef = useRef<DecorationRegistration | null>(null)
  const highlightsRef = useRef<Array<Highlight>>([])
  const [highlights, setHighlights] = useState<Array<Highlight>>([])
  const [log, setLog] = useState<Array<LogEntry>>([])

  const toDecorations = (list: Array<Highlight>): Array<Decoration> =>
    list.map((h) =>
      defineDecoration({
        id: h.id,
        type: 'range',
        range: h.range,
        render: ({children}) => (
          <span style={{background: h.color}} data-test-highlight={h.id}>
            {children}
          </span>
        ),
      }),
    )

  useEffect(() => {
    const registration = editor.registerDecorations({
      decorations: [],
      onMapped: (mappings: Array<DecorationMapping>) => {
        const at = new Date().toLocaleTimeString()
        const entries = mappings
          .filter((m) => m.newRange === null || m.contentTouched)
          .map((m) => ({
            at,
            text:
              m.newRange === null
                ? `${m.id} died (${m.origin} edit)`
                : `${m.id} content touched (${m.origin} edit)`,
          }))
        if (entries.length > 0) {
          // onMapped fires mid-apply: defer React state updates.
          queueMicrotask(() =>
            setLog((prev) => [...entries.reverse(), ...prev].slice(0, 30)),
          )
        }
        if (mappings.some((m) => m.newRange === null)) {
          queueMicrotask(sync)
        }
      },
    })
    registrationRef.current = registration
    registration.update(toDecorations(highlightsRef.current))
    return () => {
      registration.unregister()
      registrationRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Pull live (mapped) ranges back from the editor so the list and new
  // highlights start from the current positions.
  function sync() {
    const registration = registrationRef.current
    if (!registration) return
    const live = new Map(
      registration.getDecorations().map((d) => [d.id, d.range]),
    )
    const next = highlightsRef.current
      .filter((h) => live.has(h.id))
      .map((h) => ({...h, range: live.get(h.id)!}))
    highlightsRef.current = next
    setHighlights(next)
  }

  function addHighlight() {
    const selection = editor.getSnapshot().context.selection
    if (!selection) return
    sync()
    const n = highlightsRef.current.length
    const next = [
      ...highlightsRef.current,
      {
        id: `h${Date.now().toString(36)}`,
        range: selection,
        color: COLORS[n % COLORS.length],
      },
    ]
    highlightsRef.current = next
    setHighlights(next)
    registrationRef.current?.update(toDecorations(next))
  }

  function clearHighlights() {
    highlightsRef.current = []
    setHighlights([])
    registrationRef.current?.update([])
    setLog([])
  }

  const keepFocus = (event: MouseEvent) => event.preventDefault()

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
        <button type="button" onMouseDown={keepFocus} onClick={addHighlight}>
          Highlight selection
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={clearHighlights}>
          Clear
        </button>
        <button type="button" onMouseDown={keepFocus} onClick={sync}>
          Refresh list
        </button>
        <span>
          {highlights.length} local highlight(s), not saved, not shared
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
