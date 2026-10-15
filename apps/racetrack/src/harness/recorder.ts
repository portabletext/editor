import {toTextspec} from '@portabletext/editor/test'
import {
  onTestEditorCreated,
  type Context,
} from '@portabletext/editor/test/vitest'
import type {
  Checkpoint,
  ConsoleEntry,
  DomPoint,
  DomSelection,
  EditorName,
  EditorState,
  RecordedEvent,
} from '../bundle.ts'
import {toJsonSafe} from './json-safe.ts'

type Editor = Context['editor']
type Locator = Context['locator']

type AttachedEditor = {
  editor: Editor
  unsubscribe: () => void
}

/**
 * Passive observer of one scenario run: an event log fed by `editor.on('*')`
 * from the moment each editor is created, the console, and checkpoints read
 * from public editor state.
 */
export type Recorder = {
  start: (context: Context) => void
  stop: () => void
  enterStep: (index: number, label: string) => void
  markTypingStep: () => void
  /**
   * A `capture` checkpoint describes the state after the preceding step. A
   * `failure` checkpoint describes the state after the current, failed step.
   */
  capture: (reason: Checkpoint['reason']) => Promise<Checkpoint>
  readonly events: Array<RecordedEvent>
  readonly checkpoints: Array<Checkpoint>
  readonly console: Array<ConsoleEntry>
  readonly typingSteps: Set<number>
}

export function createRecorder(): Recorder {
  const editors = new Map<EditorName, AttachedEditor>()
  const events: Array<RecordedEvent> = []
  const checkpoints: Array<Checkpoint> = []
  const consoleEntries: Array<ConsoleEntry> = []
  const typingSteps = new Set<number>()
  let scenarioContext: Context | undefined
  let startTime = 0
  let stepIndex = 0
  let stepLabel = ''
  let previousStepLabel = ''
  let restoreConsole: (() => void) | undefined
  let stopListening: (() => void) | undefined

  function elapsed() {
    return Math.round(performance.now() - startTime)
  }

  function recordConsole(level: ConsoleEntry['level'], args: Array<unknown>) {
    consoleEntries.push({
      t: elapsed(),
      step: stepIndex,
      level,
      message: args.map(formatConsoleArgument).join(' '),
    })
  }

  function attach(name: EditorName, editor: Editor) {
    editors.get(name)?.unsubscribe()
    const subscription = editor.on('*', (event) => {
      events.push({
        t: elapsed(),
        step: stepIndex,
        editor: name,
        ...eventPayload(event),
      })
    })
    editors.set(name, {editor, unsubscribe: subscription.unsubscribe})
  }

  function readLocator(name: EditorName): Locator | undefined {
    return name === 'A' ? scenarioContext?.locator : scenarioContext?.locatorB
  }

  return {
    events,
    checkpoints,
    console: consoleEntries,
    typingSteps,
    start(context) {
      scenarioContext = context
      startTime = performance.now()
      stepIndex = 0
      stepLabel = ''
      previousStepLabel = ''
      events.length = 0
      checkpoints.length = 0
      consoleEntries.length = 0
      typingSteps.clear()
      restoreConsole = hookConsole(recordConsole)
      stopListening = onTestEditorCreated(({name, editor}) => {
        attach(name, editor)
      })
    },
    stop() {
      stopListening?.()
      stopListening = undefined
      for (const attached of editors.values()) {
        attached.unsubscribe()
      }
      editors.clear()
      restoreConsole?.()
      restoreConsole = undefined
      scenarioContext = undefined
    },
    enterStep(index, label) {
      stepIndex = index
      previousStepLabel = stepLabel
      stepLabel = label
    },
    markTypingStep() {
      typingSteps.add(stepIndex)
    },
    async capture(reason) {
      await settle()

      const states: Checkpoint['editors'] = {}
      for (const [name, {editor}] of editors) {
        states[name] = readEditorState(editor, readLocator(name))
      }

      const checkpoint: Checkpoint = {
        reason,
        after: reason === 'failure' ? stepLabel : previousStepLabel,
        editors: states,
      }
      checkpoints.push(checkpoint)
      return checkpoint
    },
  }
}

/**
 * The caller has already awaited the preceding step. Two animation frames
 * let the selection validation pass run. Never wait on `mutation` or any
 * flush here: that would force a batch no user causes.
 */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
}

function readEditorState(
  editor: Editor,
  locator: Locator | undefined,
): EditorState {
  const context = editor.getSnapshot().context

  return {
    textspec: toTextspec(context),
    value: toJsonSafe(context.value) as EditorState['value'],
    selection: toJsonSafe(context.selection) as EditorState['selection'],
    domSelection: locator ? readDomSelection(locator.element()) : null,
  }
}

function readDomSelection(root: Element): DomSelection | null {
  const selection = root.ownerDocument.getSelection()

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !selection.anchorNode ||
    !selection.focusNode ||
    !root.contains(selection.anchorNode) ||
    !root.contains(selection.focusNode)
  ) {
    return null
  }

  return {
    anchor: describeDomPoint(
      root,
      selection.anchorNode,
      selection.anchorOffset,
    ),
    focus: describeDomPoint(root, selection.focusNode, selection.focusOffset),
    text: selection.toString(),
  }
}

const describedAttributes = [
  'data-pt-path',
  'data-pt-block',
  'data-pt-inline',
  'data-pt-marks',
  'data-pt-text',
  'data-pt-zero-width',
  'data-pt-line-break',
  'data-pt-spacer',
]

function describeDomPoint(root: Element, node: Node, offset: number): DomPoint {
  const path: Array<string> = []
  let current: Node | null = node

  while (current && current !== root) {
    const parent: Node | null = current.parentNode
    const index = parent
      ? Array.from(parent.childNodes).indexOf(current as ChildNode)
      : 0
    path.unshift(describeNode(current, index))
    current = parent
  }

  return {path, offset}
}

function describeNode(node: Node, index: number): string {
  if (!(node instanceof Element)) {
    return `${node.nodeName.toLowerCase()}[${index}]`
  }

  const attributes = describedAttributes
    .filter((attribute) => node.hasAttribute(attribute))
    .map((attribute) => {
      const value = node.getAttribute(attribute)
      return value && value !== 'true'
        ? `[${attribute}=${JSON.stringify(value)}]`
        : `[${attribute}]`
    })
    .join('')

  return `${node.tagName.toLowerCase()}[${index}]${attributes}`
}

type EmittedEvent = Parameters<Parameters<Editor['on']>[1]>[0]

function eventPayload(
  event: EmittedEvent,
): {type: string} & Record<string, unknown> {
  switch (event.type) {
    case 'mutation':
      return {type: event.type, patches: toJsonSafe(event.patches)}
    case 'blurred':
    case 'focused':
      return {type: event.type}
    default:
      return toJsonSafe(event) as {type: string} & Record<string, unknown>
  }
}

function hookConsole(
  record: (level: ConsoleEntry['level'], args: Array<unknown>) => void,
): () => void {
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args: Array<unknown>) => {
    record('error', args)
    originalError.apply(console, args)
  }
  console.warn = (...args: Array<unknown>) => {
    record('warn', args)
    originalWarn.apply(console, args)
  }

  const onError = (event: ErrorEvent) => {
    record('error', [
      `Uncaught ${formatConsoleArgument(event.error ?? event.message)}`,
    ])
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    record('error', [
      `Unhandled rejection ${formatConsoleArgument(event.reason)}`,
    ])
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    console.error = originalError
    console.warn = originalWarn
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

function formatConsoleArgument(argument: unknown): string {
  if (argument instanceof Error) {
    return argument.stack ?? `${argument.name}: ${argument.message}`
  }

  if (typeof argument === 'string') {
    return argument
  }

  try {
    return JSON.stringify(toJsonSafe(argument)) ?? String(argument)
  } catch {
    return String(argument)
  }
}
