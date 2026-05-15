import {
  useEditor,
  useEditorSelector,
  type PortableTextBlock,
  type PortableTextObject,
} from '@portabletext/editor'
import {
  DefaultBlockquoteObjectRenderer,
  DefaultHorizontalRuleRenderer,
  DefaultImageRenderer,
  DefaultListRenderer,
  markdownToPortableText,
  portableTextToMarkdown,
  type ObjectMatcher,
  type PortableTextTypeRenderer,
} from '@portabletext/markdown'
import type {Patch} from '@portabletext/patches'
import {convertPatches} from '@portabletext/plugin-sdk-value'
import {diffValue} from '@sanity/diff-patch'
import {useEffect, useMemo, useRef, useState} from 'react'
import {highlightJson} from './highlight-json'

export interface PatchEntry {
  id: number
  patch: Patch
}

interface InspectorProps {
  patches: Array<PatchEntry>
}

type View = 'markdown' | 'patches' | 'value'

const views: Array<{id: View; label: string; hint: string}> = [
  {id: 'markdown', label: 'Markdown', hint: 'GFM source mirror'},
  {id: 'value', label: 'Value', hint: 'Portable Text JSON'},
  {id: 'patches', label: 'Patches', hint: 'Live mutation stream'},
]

export function Inspector(props: InspectorProps) {
  const [view, setView] = useState<View>('markdown')
  return (
    <aside className="pc-mirror" data-view={view}>
      <header className="pc-mirror-header">
        <span className="pc-mirror-title">Source</span>
        <ViewSwitcher value={view} onChange={setView} />
      </header>
      <div className="pc-mirror-body">
        {view === 'markdown' && <MarkdownPanel />}
        {view === 'patches' && <PatchesPanel patches={props.patches} />}
        {view === 'value' && <ValuePanel />}
      </div>
    </aside>
  )
}

function ViewSwitcher(props: {value: View; onChange: (v: View) => void}) {
  return (
    <div className="pc-view-switcher" role="tablist" aria-label="Source view">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={props.value === view.id}
          className={`pc-view-tab${
            props.value === view.id ? ' pc-view-tab-active' : ''
          }`}
          onClick={() => props.onChange(view.id)}
          title={view.hint}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}

// Pilcrow's editor shape stores code-block content as `lines` (an array
// of text blocks) and table cells as `content`. The default renderers
// expect `code` (a string) and `value` respectively. The renderers below
// adapt Pilcrow's shape to markdown output.

const pilcrowCodeBlockRenderer: PortableTextTypeRenderer<{
  _type: 'code-block'
  language?: string
  lines?: Array<{children?: Array<{text?: string}>}>
}> = ({value}) => {
  const code = (value.lines ?? [])
    .map((block) =>
      (block.children ?? []).map((child) => child.text ?? '').join(''),
    )
    .join('\n')
  return `\`\`\`${value.language ?? ''}\n${code}\n\`\`\``
}

const pilcrowTableRenderer: PortableTextTypeRenderer<{
  _type: 'table'
  headerRows?: number
  rows?: Array<{
    _key: string
    cells?: Array<{
      _key: string
      content?: Array<unknown>
    }>
  }>
}> = ({value, renderNode}) => {
  const headerRows = value.headerRows ?? 0
  const rows = value.rows ?? []
  const lines: Array<string> = []

  const renderCell = (blocks: Array<unknown>): string =>
    blocks
      .map((block, index) =>
        renderNode({
          node: block as {_type: string},
          index,
          isInline: false,
          renderNode,
        }),
      )
      .join(' ')
      .trim()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) {
      continue
    }
    const cellTexts = (row.cells ?? []).map((cell) =>
      renderCell(cell.content ?? []),
    )
    lines.push(`| ${cellTexts.join(' | ')} |`)
    if (i === headerRows - 1 && row.cells) {
      const separators = row.cells.map(() => ' --- ')
      lines.push(`|${separators.join('|')}|`)
    }
  }

  return lines.join('\n')
}

const pilcrowCalloutRenderer: PortableTextTypeRenderer<{
  _type: 'callout'
  tone?: string
  content?: Array<PortableTextBlock>
}> = ({value, renderNode}) => {
  const tone = (value.tone ?? 'note').toUpperCase()
  const content = value.content ?? []
  const renderedContent = content
    .map((block, index) =>
      renderNode({
        node: {...block, style: 'normal'},
        index,
        isInline: false,
        renderNode,
      }),
    )
    .join('\n\n')
  const prefixed = renderedContent
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n')
  return `> [!${tone}]\n${prefixed}`
}

const markdownTypeRenderers = {
  'image': DefaultImageRenderer,
  'horizontal-rule': DefaultHorizontalRuleRenderer,
  'code-block': pilcrowCodeBlockRenderer,
  'callout': pilcrowCalloutRenderer,
  'table': pilcrowTableRenderer,
  'list': DefaultListRenderer,
  'blockquote': DefaultBlockquoteObjectRenderer,
}

// Custom matchers for `markdownToPortableText`. The default matchers produce
// `{_type: 'code', code: string}` and `{_type: 'table', cells: [{value}]}`
// shapes, which don't fit Pilcrow's editor schema (`code-block` with a
// `lines` array of text blocks; `table` with `cells[i].content`). The
// matchers below reshape the deserializer output to match.

const pilcrowCodeMatcher: ObjectMatcher<{
  language: string | undefined
  code: string
}> = ({value, context}) => {
  const keyGen = context.keyGenerator
  const lines = (value.code ?? '').split('\n').map((lineText) => ({
    _type: 'block',
    _key: keyGen(),
    style: 'normal',
    children: [{_type: 'span', _key: keyGen(), text: lineText, marks: []}],
    markDefs: [],
  }))
  return {
    _type: 'code-block',
    _key: keyGen(),
    language: value.language,
    lines,
  }
}

const pilcrowTableMatcher: ObjectMatcher<{
  headerRows: number | undefined
  rows: Array<{
    _key: string
    _type: 'row'
    cells: Array<{
      _type: 'cell'
      _key: string
      value: Array<PortableTextBlock>
    }>
  }>
}> = ({value, context}) => {
  return {
    _type: 'table',
    _key: context.keyGenerator(),
    headerRows: value.headerRows,
    rows: value.rows.map((row) => ({
      _type: 'row',
      _key: row._key,
      cells: row.cells.map((cell) => ({
        _type: 'cell',
        _key: cell._key,
        content: cell.value,
      })),
    })),
  }
}

const pilcrowListMatcher: ObjectMatcher<{
  kind: 'bullet' | 'number' | 'task'
  items: Array<{
    _type: 'list-item'
    _key: string
    checked?: boolean
    content: Array<PortableTextBlock | PortableTextObject>
  }>
}> = ({value, context}) => {
  return {
    _type: 'list',
    _key: context.keyGenerator(),
    kind: value.kind,
    items: value.items.map((item) => ({
      _type: 'list-item' as const,
      _key: item._key,
      ...(value.kind === 'task' ? {checked: item.checked === true} : {}),
      content: item.content,
    })),
  }
}

const pilcrowBlockquoteMatcher: ObjectMatcher<{
  content: Array<PortableTextBlock>
}> = ({value, context}) => {
  return {
    _type: 'blockquote',
    _key: context.keyGenerator(),
    content: value.content,
  }
}

const pilcrowMarkdownTypeMatchers = {
  code: pilcrowCodeMatcher,
  table: pilcrowTableMatcher,
  list: pilcrowListMatcher,
  blockquote: pilcrowBlockquoteMatcher,
}

const SYNC_DEBOUNCE_MS = 250

function MarkdownPanel() {
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const serialized = useMemo(() => {
    try {
      return portableTextToMarkdown(value, {types: markdownTypeRenderers})
    } catch (error) {
      return `<!-- Failed to serialize: ${(error as Error).message} -->`
    }
  }, [value])

  // `draft` holds the textarea's local state while the user is editing.
  // `null` means there is no local draft - the textarea mirrors the
  // editor value via `serialized`. The draft persists across editor
  // mutations so the user's in-progress typing isn't clobbered, but
  // clears on blur so editor -> markdown sync resumes.
  const [draft, setDraft] = useState<string | null>(null)
  const displayed = draft ?? serialized

  // Track the last value the textarea diffed against so we can use it
  // as the source for the next `diffValue` call. This lives in a ref
  // because the diff runs in a debounced callback and we don't want
  // to re-create the timer every render.
  const lastSyncedRef = useRef<Array<PortableTextBlock>>(value)
  useEffect(() => {
    if (draft === null) {
      lastSyncedRef.current = value
    }
  }, [draft, value])

  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const [syncError, setSyncError] = useState<string | null>(null)

  const performSync = (markdown: string) => {
    try {
      const next = markdownToPortableText(markdown, {
        types: pilcrowMarkdownTypeMatchers,
      })
      const source = lastSyncedRef.current
      const wirePatches = diffValue(source as never, next as never)
      const patches = convertPatches(wirePatches)
      if (patches.length > 0) {
        editor.send({
          type: 'patches',
          patches,
          snapshot: source as never,
        })
        lastSyncedRef.current = next as Array<PortableTextBlock>
      }
      setSyncError(null)
    } catch (error) {
      setSyncError((error as Error).message)
    }
  }

  const scheduleSync = (markdown: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      performSync(markdown)
    }, SYNC_DEBOUNCE_MS)
  }

  const flushPendingSync = (markdown: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
      performSync(markdown)
    }
  }

  const [copied, setCopied] = useState(false)

  return (
    <div className="pc-panel pc-panel-stretch">
      <header className="pc-panel-actions">
        {syncError ? (
          <span className="pc-panel-error">Sync error: {syncError}</span>
        ) : null}
        <button
          type="button"
          className="pc-button"
          onClick={async () => {
            await navigator.clipboard.writeText(displayed)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </header>
      <textarea
        className="pc-markdown-textarea"
        value={displayed}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          scheduleSync(next)
        }}
        onBlur={() => {
          // Flush any pending debounced sync before clearing the draft -
          // otherwise the textarea reverts to the last-serialized value
          // because the debounce timer hasn't dispatched yet.
          if (draft !== null) {
            flushPendingSync(draft)
          }
          setDraft(null)
        }}
      />
    </div>
  )
}

function PatchesPanel(props: {patches: Array<PatchEntry>}) {
  if (props.patches.length === 0) {
    return (
      <div className="pc-panel">
        <p className="pc-panel-empty">No patches yet. Type in the editor.</p>
      </div>
    )
  }
  return (
    <div className="pc-panel pc-panel-list">
      {props.patches.map((entry, index) => (
        <PatchRow key={entry.id} entry={entry} index={index} />
      ))}
    </div>
  )
}

function PatchRow(props: {entry: PatchEntry; index: number}) {
  const {patch} = props.entry
  return (
    <article className="pc-patch">
      <header className="pc-patch-header">
        <span className="pc-patch-index">{props.index + 1}</span>
        <span className="pc-patch-type">{patch.type}</span>
      </header>
      <pre className="pc-patch-body">
        {highlightJson(JSON.stringify(omit(patch, ['type']), null, 2))}
      </pre>
    </article>
  )
}

function ValuePanel() {
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const text = useMemo(() => JSON.stringify(value, null, 2), [value])
  const [copied, setCopied] = useState(false)
  return (
    <div className="pc-panel">
      <header className="pc-panel-actions">
        <button
          type="button"
          className="pc-button"
          onClick={async () => {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </header>
      <pre className="pc-panel-text">{highlightJson(text)}</pre>
    </div>
  )
}

function omit<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: Array<K>,
): Omit<T, K> {
  const result = {...source}
  for (const key of keys) {
    delete result[key]
  }
  return result
}
