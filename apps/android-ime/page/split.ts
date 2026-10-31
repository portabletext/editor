// A control with no editor: on each `input`, when the text node under the caret ends with `word`, the
// page splits it or restyles it the way `mode` names, so its event log shows whether Gboard loses the word
// for any write under the caret or only for the editor's.

declare global {
  interface Window {
    __state: () => unknown
  }
}

type Mode = 'replace' | 'keep' | 'style' | 'none' | 'bounce' | 'replace-bounce'

type Caret = {
  /** The anchor node's `nodeName`, `#text` for a text node. */
  anchorNode: string | null
  /** The anchor node's text. */
  anchorText: string | null
  anchorOffset: number | null
  /** The `nodeName` of the anchor node's parent. */
  parent: string | null
  /** Whether a `compositionstart` has come without its `compositionend`. */
  isComposing: boolean
}

const params = new URLSearchParams(location.search)
const mode = params.get('mode') as Mode
const word = params.get('word') ?? ''
const prefix = params.get('prefix') ?? ''

const field = document.getElementById('ed')!
const log = document.getElementById('log')!
const events: Array<Record<string, unknown>> = []
const errors: string[] = []
let composing = false
// Whether the caret's text node ended with `word` at the last `input`, so a write runs once per completion.
let wasComplete = false

// The span `mode=style` restyles. Its text node is the one typing goes into from the start.
const styled = document.createElement('span')
if (mode === 'style') {
  styled.append(prefix === '' ? document.createElement('br') : prefix)
  field.append(styled)
} else if (prefix !== '') {
  field.append(prefix)
}

// The driver puts the caret at the end of the field, after the span, where typing would not go into it.
if (mode === 'style') {
  document.addEventListener('selectionchange', () => {
    const selection = getSelection()
    if (
      selection?.isCollapsed &&
      selection.anchorNode === field &&
      selection.anchorOffset === field.childNodes.length
    ) {
      const last = styled.lastChild
      if (last instanceof Text) selection.collapse(last, last.length)
      else selection.collapse(styled, 0)
    }
  })
}

window.addEventListener('error', (event) => {
  recordError(event.error ?? event.message)
})
window.addEventListener('unhandledrejection', (event) => {
  recordError(event.reason)
})

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
      record({
        type,
        inputType: event instanceof InputEvent ? event.inputType : undefined,
        data:
          event instanceof InputEvent || event instanceof CompositionEvent
            ? event.data
            : undefined,
        text: field.textContent,
      })
    },
    true,
  )
}

// The write runs in the `input` event itself, as the editor's render would at the latest on Android, so
// Chrome hands the next IME update a DOM the write has already changed.
field.addEventListener('input', (event) => {
  try {
    write(event as InputEvent)
  } catch (error) {
    recordError(error)
  }
})

window.__state = () => ({
  text: field.textContent,
  dom: field.textContent,
  html: field.innerHTML,
  focused: document.activeElement === field,
  events,
  errors,
})

function write(event: InputEvent) {
  const selection = getSelection()
  const node = selection?.anchorNode
  if (!selection || !(node instanceof Text) || !field.contains(node)) return
  const complete = node.data.endsWith(word)
  const completed = complete && !wasComplete
  wasComplete = complete
  if (mode === 'style') {
    if (!completed || node.parentNode !== styled) return
    const before = caret()
    styled.style.background = styled.style.background === '' ? 'yellow' : ''
    record({
      type: 'write',
      mode,
      ...trigger(event),
      op: `background ${styled.style.background || 'none'}`,
      before,
      after: caret(),
    })
    return
  }
  if (mode === 'bounce') {
    if (completed) bounce(event, node)
    return
  }
  if (!complete) return
  // The word already sits alone in a span of an earlier write, so there is nothing to split off.
  if (node.data === word && node.parentElement?.dataset.split !== undefined)
    return
  const before = caret()
  if (mode === 'none') {
    record({type: 'match', mode, ...trigger(event), before})
    return
  }
  const start = node.data.length - word.length
  const span = document.createElement('span')
  span.dataset.split = ''
  span.style.background = 'yellow'
  let wordNode: Text
  let op: string
  if (mode === 'replace' || mode === 'replace-bounce') {
    wordNode = document.createTextNode(word)
    span.append(wordNode)
    const head = node.data.slice(0, start)
    node.replaceWith(
      ...(head === '' ? [] : [document.createTextNode(head)]),
      span,
    )
    op = head === '' ? 'replaceWith(span)' : 'replaceWith(text, span)'
  } else if (start === 0) {
    // `splitText(0)` would leave the caret's node empty and move its text to a new one, so the word's
    // own node goes into the span.
    wordNode = node
    node.before(span)
    span.append(node)
    op = 'wrap'
  } else {
    wordNode = node.splitText(start)
    wordNode.before(span)
    span.append(wordNode)
    op = `splitText(${start}), wrap tail`
  }
  if (mode === 'replace-bounce') {
    record({type: 'write', mode, ...trigger(event), op, before, after: caret()})
    // The editor's pair: into the new leaf's text node, then straight back to the node the caret was in,
    // which the replace has detached.
    bounceTo(event, wordNode, word.length, node, before.anchorOffset ?? 0)
    return
  }
  const moved =
    selection.anchorNode !== wordNode ||
    selection.anchorOffset !== word.length ||
    !selection.isCollapsed
  if (mode === 'replace' || moved) selection.collapse(wordNode, word.length)
  record({
    type: 'write',
    mode,
    ...trigger(event),
    op,
    restored: mode === 'replace' || moved,
    before,
    after: {...caret(), sameNode: selection.anchorNode === node},
  })
}

// `mode=bounce`: no node under the caret changes. An empty span goes in after the caret's node, the caret
// moves into it and straight back.
function bounce(event: InputEvent, node: Text) {
  const before = caret()
  const span = document.createElement('span')
  span.dataset.split = ''
  node.after(span)
  record({
    type: 'write',
    mode,
    ...trigger(event),
    op: 'after(span)',
    before,
    after: caret(),
  })
  bounceTo(event, span, 0, node, before.anchorOffset ?? 0)
}

// `removeAllRanges` and `addRange` into `(into, intoOffset)`, then `setBaseAndExtent` back to
// `(back, backOffset)`, each logged with the caret it leaves.
function bounceTo(
  event: InputEvent,
  into: Node,
  intoOffset: number,
  back: Node,
  backOffset: number,
) {
  const selection = getSelection()!
  const range = document.createRange()
  range.setStart(into, intoOffset)
  range.collapse(true)
  selection.removeAllRanges()
  record({
    type: 'write',
    mode,
    ...trigger(event),
    op: 'removeAllRanges',
    after: caret(),
  })
  selection.addRange(range)
  record({
    type: 'write',
    mode,
    ...trigger(event),
    op: 'addRange',
    after: caret(),
  })
  let threw: string | undefined
  try {
    selection.setBaseAndExtent(back, backOffset, back, backOffset)
  } catch (error) {
    threw =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  }
  record({
    type: 'write',
    mode,
    ...trigger(event),
    op: 'setBaseAndExtent',
    target: {
      connected: back.isConnected,
      text: back.textContent,
      offset: backOffset,
    },
    ...(threw === undefined ? {} : {threw}),
    after: {...caret(), sameNode: selection.anchorNode === back},
  })
}

function trigger(event: InputEvent) {
  return {
    word,
    inputType: event.inputType,
    data: event.data,
    eventIsComposing: event.isComposing,
  }
}

function caret(): Caret {
  const selection = getSelection()
  const node = selection?.anchorNode ?? null
  return {
    anchorNode: node?.nodeName ?? null,
    anchorText: node?.textContent ?? null,
    anchorOffset: selection?.anchorOffset ?? null,
    parent: node?.parentNode?.nodeName ?? null,
    isComposing: composing,
  }
}

function record(entry: Record<string, unknown>) {
  events.push(entry)
  log.textContent = events.map((each) => JSON.stringify(each)).join('\n')
}

function recordError(error: unknown) {
  errors.push(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  )
}

field.focus()

export {}
