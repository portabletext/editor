/**
 * The task each entry lands in, relative to the latest `input`. `beforeInput` is after a `beforeinput` whose
 * `input` has not come yet. `task` is a later task that ran before both the frame callback and the
 * `setTimeout(0)` requested at the `input`.
 */
type Phase =
  | 'beforeInput'
  | 'dispatch'
  | 'microtask'
  | 'task'
  | 'afterFrame'
  | 'afterTimeout'
  | 'afterFrameAndTimeout'

type Anchor = {
  node: string | null
  text: string | null
  offset: number | null
  decorated: boolean
  /** Whether the anchor is the node it was at the latest `input`. */
  sameNode: boolean | null
}

type Entry = {
  kind:
    | 'beforeinput'
    | 'input'
    | 'prevented'
    | 'dispatchEnd'
    | 'microtasksEnd'
    | 'frame'
    | 'timeout'
    | 'ranges'
    | 'leaf'
    | 'selectionchange'
    | 'select'
  /** The `input` (or cancelled `beforeinput`, `prevented`) the entry follows, numbered from 1. */
  input: number | null
  /** Milliseconds since that `input`. */
  ms: number | null
  phase: Phase | null
  t: number
  anchor: Anchor
  inputType?: string
  data?: string | null
  texts?: string[]
  text?: string
}

type InputState = {
  id: number
  t: number
  anchorNode: Node | null
  dispatching: boolean
  microtasks: boolean
  frame: boolean
  timeout: boolean
}

const SELECTION_WRITES = [
  'addRange',
  'collapse',
  'collapseToEnd',
  'collapseToStart',
  'extend',
  'removeAllRanges',
  'selectAllChildren',
  'setBaseAndExtent',
  'setPosition',
] as const

// A microtask chain this long keeps the `input` task's microtask checkpoint open past any work React and the
// editor queue in it, so an entry recorded before the chain ends ran in that task.
const MICROTASK_CHAIN = 100

/**
 * Logs `beforeinput`, `input`, `selectionchange` and the editor's decoration commits with the time and task
 * relative to the latest `input`. After each `input` it logs the end of the event's dispatch (the last bubble
 * listener), the end of its microtask checkpoint, a frame callback and a `setTimeout(0)`, and each entry
 * records which of these had run.
 */
export function splitTiming(): {
  entries: Entry[]
  ranges: (ranges: Array<{text: string}>) => void
  leaf: (element: HTMLElement | null) => void
} {
  const entries: Entry[] = []
  const decorations = new WeakSet<Node>()
  let current: InputState | undefined
  let beforeInputPending = false

  const push = (kind: Entry['kind'], extra: Partial<Entry> = {}) => {
    const t = performance.now()
    entries.push({
      kind,
      input: current?.id ?? null,
      ms: current ? round(t - current.t) : null,
      phase: phase(),
      t: round(t),
      anchor: anchor(),
      ...extra,
    })
  }

  const phase = (): Phase | null => {
    if (beforeInputPending) return 'beforeInput'
    if (!current) return null
    if (current.dispatching) return 'dispatch'
    if (current.microtasks) return 'microtask'
    if (current.frame && current.timeout) return 'afterFrameAndTimeout'
    if (current.frame) return 'afterFrame'
    if (current.timeout) return 'afterTimeout'
    return 'task'
  }

  const anchor = (): Anchor => {
    const selection = document.getSelection()
    const node = selection?.anchorNode ?? null
    let decorated = false
    for (let ancestor = node; ancestor; ancestor = ancestor.parentNode) {
      if (decorations.has(ancestor)) {
        decorated = true
        break
      }
    }
    return {
      node: node?.nodeName ?? null,
      text: node instanceof Text ? node.data : null,
      offset: selection ? selection.anchorOffset : null,
      decorated,
      sameNode: current ? node === current.anchorNode : null,
    }
  }

  window.addEventListener(
    'beforeinput',
    (event) => {
      beforeInputPending = true
      push('beforeinput', inputFields(event))
    },
    true,
  )

  window.addEventListener('input', (event) => start(event, 'input'), true)

  // A `beforeinput` the editor cancelled fires no `input`, so its own dispatch is the one the editor's
  // change follows.
  window.addEventListener('beforeinput', (event) => {
    if (event.defaultPrevented) start(event, 'prevented')
  })

  // The last listener of an `input` that bubbles to `window`. One whose propagation was stopped ends its
  // dispatch at the first stamp after it, logged as `dispatchEnd` with `data: 'missing'`.
  window.addEventListener('input', endListeners)
  window.addEventListener('beforeinput', (event) => {
    if (event.defaultPrevented) endListeners()
  })

  // `selectionchange` is queued, so it can land a task after the write that caused it. Each call that sets
  // the selection is logged as it runs, `select`, with the method and the anchor it leaves.
  document.addEventListener('selectionchange', () => push('selectionchange'))
  for (const method of SELECTION_WRITES) {
    const original = Selection.prototype[method] as (
      this: Selection,
      ...args: unknown[]
    ) => unknown
    Object.defineProperty(Selection.prototype, method, {
      configurable: true,
      writable: true,
      value: function (this: Selection, ...args: unknown[]) {
        const result = original.apply(this, args)
        push('select', {data: method})
        return result
      },
    })
  }

  function start(event: Event, kind: 'input' | 'prevented') {
    beforeInputPending = false
    const state: InputState = {
      id: (current?.id ?? 0) + 1,
      t: performance.now(),
      anchorNode: document.getSelection()?.anchorNode ?? null,
      dispatching: true,
      microtasks: false,
      frame: false,
      timeout: false,
    }
    current = state
    push(kind, inputFields(event))
    requestAnimationFrame(() => {
      endDispatch(state)
      state.frame = true
      stamp(state, 'frame')
    })
    setTimeout(() => {
      endDispatch(state)
      state.timeout = true
      stamp(state, 'timeout')
    }, 0)
  }

  function endListeners() {
    const state = current
    if (!state?.dispatching) return
    stamp(state, 'dispatchEnd')
    state.dispatching = false
    state.microtasks = true
    let links = 0
    const link = () => {
      links++
      if (links < MICROTASK_CHAIN) {
        queueMicrotask(link)
        return
      }
      stamp(state, 'microtasksEnd')
      state.microtasks = false
    }
    queueMicrotask(link)
  }

  // Stamps of an earlier `input` are still logged, against the latest one.
  function stamp(state: InputState, kind: Entry['kind']) {
    push(kind, state === current ? {} : {data: `input ${state.id}`})
  }

  function endDispatch(state: InputState) {
    if (!state.dispatching) return
    push('dispatchEnd', {data: 'missing'})
    state.dispatching = false
  }

  return {
    entries,
    ranges: (ranges) => push('ranges', {texts: ranges.map(({text}) => text)}),
    leaf: (element) => {
      if (element) decorations.add(element)
      push('leaf', {text: element?.textContent ?? ''})
    },
  }
}

function inputFields(event: Event): Partial<Entry> {
  return event instanceof InputEvent
    ? {inputType: event.inputType, data: event.data}
    : {}
}

function round(milliseconds: number): number {
  return Math.round(milliseconds * 10) / 10
}
