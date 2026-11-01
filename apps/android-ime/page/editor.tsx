import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type EditorSelection,
  type EditorSnapshot,
  type RangeDecoration,
} from '@portabletext/editor'
import {
  defineBehavior,
  effect,
  forward,
  raise,
} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {
  getFocusTextBlock,
  getSelectionText,
} from '@portabletext/editor/selectors'
import {
  blockOffsetsToSelection,
  getTextBlockText,
  isTextBlock,
} from '@portabletext/editor/utils'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react'
import {createRoot} from 'react-dom/client'
import {Committed} from './committed'
import {frozenLog} from './frozen-log'
import {splitTiming} from './split-timing'

declare global {
  interface Window {
    __state: () => unknown
  }
}

const schemaDefinition = defineSchema({styles: [{name: 'normal'}]})

const params = new URLSearchParams(location.search)
const prefix = params.get('prefix') ?? ''
const decorate = params.get('decorate') ?? ''
const behavior = params.get('behavior')
const gap = params.get('gap') ?? ''
// The crash and Enter cases' pages. Without these params `editor.html` stays the page the composition
// tests were written against: it records no errors, and an exception in `__state` reaches the driver.
const crashCase =
  params.has('decorate') || params.has('behavior') || params.has('gap')
const timing = crashCase && params.get('timing') === '1' ? splitTiming() : null

const keyGenerator = createTestKeyGenerator()

// Spike: `gap=<text>` seeds a block with `<text>` above the block the driver types in, see
// `gapDecorations`.
const gapBlock = gap
  ? [
      {
        _type: 'block',
        _key: keyGenerator(),
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: keyGenerator(), text: gap, marks: []}],
      },
    ]
  : []

const initialValue = [
  ...gapBlock,
  {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text: prefix, marks: []}],
  },
]

const events: Array<Record<string, unknown>> = []
const errors: string[] = []
const decorated: Array<{
  text: string
  composing: boolean
  element: HTMLElement | null
}> = []
// Each log ends at the page's first error, so it holds what led up to a crash and not React's or the
// editor's reaction to it.
const committed = frozenLog<Array<{text: string; composing: boolean}>>(errors)
const deletions = frozenLog<{at: EditorSelection}>(errors)
let composing = false
let gapChanges = 0

if (crashCase) {
  window.addEventListener('error', (event) => {
    recordError(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    recordError(event.reason)
  })
}

const dissolveOnBreak = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    if (!focusTextBlock || getTextBlockText(focusTextBlock.node) !== '- ') {
      return false
    }
    const at = blockOffsetsToSelection({
      snapshot,
      offsets: {
        anchor: {path: focusTextBlock.path, offset: 0},
        focus: {path: focusTextBlock.path, offset: 2},
      },
    })
    return at ? {at} : false
  },
  actions: [(_, {at}) => [raise({type: 'delete.text', at})]],
})

// `raise` sends its event through every registered Behavior again, so this sees the `delete.text` that
// `dissolveOnBreak` raises once the editor performs it, and records it before forwarding it to the
// deletion.
const recordDeleteText = defineBehavior({
  on: 'delete.text',
  actions: [
    ({event}) => [
      effect(() => deletions.record({at: event.at})),
      forward(event),
    ],
  ],
})

const behaviors =
  behavior === 'dissolve-on-break' ? [dissolveOnBreak, recordDeleteText] : []

function Probe() {
  const editor = useEditor()
  useEffect(() => {
    if (!crashCase) {
      window.__state = () => {
        const {context} = editor.getSnapshot()
        const text = (context.value ?? [])
          .map((block) =>
            isTextBlock(context, block) ? getTextBlockText(block) : '',
          )
          .join('\n')
        const dom = document.querySelector('[contenteditable]')?.textContent
        return {text, dom, events}
      }
      return
    }
    // The editor can be left broken by a crash, so the state falls back to
    // the last value read and never throws.
    let last = {text: null as string | null, blocks: null as number | null}
    window.__state = () => {
      try {
        const {context} = editor.getSnapshot()
        const value = context.value ?? []
        last = {
          text: value
            .map((block) =>
              isTextBlock(context, block) ? getTextBlockText(block) : '',
            )
            .join('\n'),
          blocks: value.length,
        }
      } catch (error) {
        recordError(error)
      }
      const editable = document.querySelector('[contenteditable]')
      return {
        ...last,
        dom: editable?.textContent,
        focused: editable !== null && document.activeElement === editable,
        events,
        errors,
        committed: committed.entries,
        deletions: deletions.entries,
        ...(timing ? {splitTiming: timing.entries} : {}),
        decorated: decorated.map(({element, ...entry}) => ({
          ...entry,
          live: element?.textContent ?? null,
        })),
      }
    }
  }, [editor])
  return null
}

function Editable() {
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const {decorations, ranges} = useMemo(() => {
    if (!decorate && !gap) return {decorations: [], ranges: []}
    const snapshot = editor.getSnapshot()
    const decorations = [
      ...(decorate ? wordDecorations(snapshot, decorate) : []),
      ...gapDecorations(snapshot),
    ]
    return {
      decorations,
      ranges: decorations.map(({selection}) => ({
        text: selectedText(snapshot, selection),
        composing,
      })),
    }
  }, [editor, value])
  // `PortableTextEditable` hands its `rangeDecorations` to the editor in an effect, which runs only for a
  // render that committed, so the ranges are logged in the commit that hands them over, before any DOM
  // change they cause. A render React abandons or supersedes logs nothing.
  return (
    <>
      {decorate || gap ? (
        <Committed value={ranges} record={recordCommitted} />
      ) : null}
      <PortableTextEditable
        rangeDecorations={decorations}
        style={{border: '1px solid #888', minHeight: '3em', fontSize: 20}}
      />
    </>
  )
}

function App() {
  return (
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue, keyGenerator}}
    >
      <Probe />
      {crashCase ? (
        <>
          <BehaviorPlugin behaviors={behaviors} />
          <Editable />
        </>
      ) : (
        <PortableTextEditable
          style={{border: '1px solid #888', minHeight: '3em', fontSize: 20}}
        />
      )}
    </EditorProvider>
  )
}

export const root = createRoot(
  document.getElementById('root')!,
  crashCase
    ? {onUncaughtError: recordError, onCaughtError: recordError}
    : undefined,
)
root.render(<App />)

const log = document.getElementById('log')!
for (const type of [
  'beforeinput',
  'input',
  'compositionstart',
  'compositionupdate',
  'compositionend',
]) {
  document.addEventListener(
    type,
    (event) => {
      if (type === 'compositionstart') composing = true
      if (type === 'compositionend') composing = false
      events.push({
        type,
        inputType: event instanceof InputEvent ? event.inputType : undefined,
        data:
          event instanceof InputEvent || event instanceof CompositionEvent
            ? event.data
            : undefined,
      })
      log.textContent = events.map((entry) => JSON.stringify(entry)).join('\n')
    },
    true,
  )
}

/** A decoration over every occurrence of `word` in each text block. */
function wordDecorations(
  snapshot: EditorSnapshot,
  word: string,
): RangeDecoration[] {
  const decorations: RangeDecoration[] = []
  for (const block of snapshot.context.value) {
    if (!isTextBlock(snapshot.context, block)) continue
    const text = getTextBlockText(block)
    for (
      let offset = text.indexOf(word);
      offset !== -1;
      offset = text.indexOf(word, offset + word.length)
    ) {
      const selection = blockOffsetsToSelection({
        snapshot,
        offsets: {
          anchor: {path: [{_key: block._key}], offset},
          focus: {path: [{_key: block._key}], offset: offset + word.length},
        },
      })
      if (selection) decorations.push({component: Highlight, selection})
    }
  }
  return decorations
}

/**
 * Spike: a decoration over the start of the `gap` block that grows by a character, and wraps back to one,
 * on each change of the value while a composition is open. The IME composes in another block, so the
 * editor renders each change as a `Text`-only commit away from the composing text.
 */
function gapDecorations(snapshot: EditorSnapshot): RangeDecoration[] {
  const block = gapBlock[0]
  if (!block) return []
  if (composing) gapChanges += 1
  const selection = blockOffsetsToSelection({
    snapshot,
    offsets: {
      anchor: {path: [{_key: block._key}], offset: 0},
      focus: {
        path: [{_key: block._key}],
        offset: (gapChanges % gap.length) + 1,
      },
    },
  })
  return selection ? [{component: Highlight, selection}] : []
}

// The editor calls a decoration's `component` as a function inside its leaf, so hooks there would be the
// leaf's own. `Decorated` is the component that mounts with each decoration.
function Highlight(props: PropsWithChildren) {
  return <Decorated>{props.children}</Decorated>
}

// The log ends at the page's first error, so it holds the decorations up to a crash and not React's
// unmounting after it.
function Decorated(props: PropsWithChildren) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (errors.length > 0) return
    const entry = {
      text: ref.current?.textContent ?? '',
      composing,
      element: ref.current,
    }
    decorated.push(entry)
    timing?.leaf(ref.current)
    return () => {
      if (errors.length === 0) entry.element = null
    }
  }, [])
  return (
    <span ref={ref} style={{background: 'yellow'}}>
      {props.children}
    </span>
  )
}

function recordCommitted(ranges: Array<{text: string; composing: boolean}>) {
  committed.record(ranges)
  timing?.ranges(ranges)
}

function selectedText(
  snapshot: EditorSnapshot,
  selection: RangeDecoration['selection'],
): string {
  return selection
    ? getSelectionText({...snapshot, context: {...snapshot.context, selection}})
    : ''
}

function recordError(error: unknown) {
  errors.push(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  )
}
