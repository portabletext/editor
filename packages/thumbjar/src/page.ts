declare global {
  interface Window {
    __state: () => unknown
    __field: () => HTMLElement | null
    /** The field's text and direction-aware selection in UTF-16 offsets, or `null` outside the field. */
    __selection: () => {
      text: string | null
      anchor: number | null
      focus: number | null
    } | null
  }
}

/** Other `input` types either take no text or, like `email` and `number`, do not support `setSelectionRange`. */
export const TEXT_FIELD_SELECTOR =
  'textarea, input:not([type]), input[type=""], input[type="text" i], input[type="search" i], input[type="tel" i], input[type="url" i], input[type="password" i], [contenteditable]'

const EVENT_TYPES = [
  'beforeinput',
  'input',
  'compositionstart',
  'compositionupdate',
  'compositionend',
]

/**
 * Record the page's `beforeinput`, `input` and composition events and install `window.__state`, which
 * `typeOnDevice` reads after each word. Call it once from the page `typeOnDevice` opens.
 *
 * The driver types into `field`, or without it into the first `textarea`, text `input` or
 * `[contenteditable]` in the document. A field's text is its `value` for a `textarea` or an `input`
 * and its `textContent` otherwise.
 *
 * Without `field`, events are recorded on `document` in the capture phase, so the field may render
 * later, and `window.__state()` returns `{text, dom, events}`, `dom` being the text of the field the
 * driver types into. With `field`, events are recorded on the field with its text at each event, and
 * `window.__state()` returns `{text, events}`.
 *
 * A page seeds the field and then leaves it to the keyboard. A page that controls it, writing its
 * `value` back from its own state on each input the way a React `value` prop does, restarts Gboard's
 * composition: it nested 7 of 8 Japanese compositions on a `textarea`.
 *
 * Events record `type`, `inputType`, `data`, `text` and `selection` (`{anchor, focus}` in
 * UTF-16 offsets, or `null` outside the field). `text` is `null` without a field; document
 * listeners resolve `window.__field()` at event time. `beforeinput` and `input` also record
 * `isComposing`, `cancelable` and, when supported, `targetRanges` during dispatch. Each range is
 * `{start, end}` in UTF-16 offsets or `null` outside the field; no ranges gives `[]`.
 * `defaultPrevented` is absent until a zero-delay timer reads it after the whole dispatch.
 * Failed reads record `null` for that field.
 *
 * Each recorded event is also printed to a `#log` element when the page has one.
 *
 * @example
 * ```ts
 * import type {Editor, EditorSnapshot} from '@portabletext/editor'
 * import {getTextBlockText, isTextBlock} from '@portabletext/editor/utils'
 * import {recordInput} from 'thumbjar/page'
 *
 * function editorText({context}: EditorSnapshot) {
 *   return (context.value ?? [])
 *     .map((block) => (isTextBlock(context, block) ? getTextBlockText(block) : ''))
 *     .join('\n')
 * }
 *
 * function recordEditorInput(editor: Editor) {
 *   recordInput({getText: () => editorText(editor.getSnapshot())})
 * }
 * ```
 */
export function recordInput({
  getText,
  getState,
  field,
}: {
  /** The text `window.__state()` reports, read when the driver calls it. */
  getText: () => string | null
  /** Optional JSON state read alongside the text; exceptions propagate to the driver. */
  getState?: () => unknown
  /** The field to type into and record on, for a page with no editor model of its own. */
  field?: HTMLElement | HTMLTextAreaElement | HTMLInputElement
}): void {
  const events: Array<Record<string, unknown>> = []
  const log = document.getElementById('log')
  for (const type of EVENT_TYPES) {
    const listener = (event: Event) => {
      const currentField = read(() => field ?? window.__field())
      const entry: Record<string, unknown> = {
        type,
        inputType: read(() =>
          event instanceof InputEvent ? event.inputType : undefined,
        ),
        data: read(() =>
          event instanceof InputEvent || event instanceof CompositionEvent
            ? event.data
            : undefined,
        ),
        text: read(() => (currentField ? fieldText(currentField) : null)),
        selection: read(() => fieldSelection(currentField)),
      }
      if (type === 'beforeinput' || type === 'input') {
        entry.isComposing = read(() =>
          event instanceof InputEvent ? event.isComposing : undefined,
        )
        entry.cancelable = read(() => event.cancelable)
        const targetRanges = read(() => {
          const getTargetRanges =
            event instanceof InputEvent ? event.getTargetRanges : undefined
          if (typeof getTargetRanges !== 'function') {
            return undefined
          }
          return Array.from(getTargetRanges.call(event), (range) =>
            read(() => {
              const start = fieldOffset(
                currentField,
                range.startContainer,
                range.startOffset,
              )
              const end = fieldOffset(
                currentField,
                range.endContainer,
                range.endOffset,
              )
              return start === null || end === null ? null : {start, end}
            }),
          )
        })
        if (targetRanges !== undefined) {
          entry.targetRanges = targetRanges
        }
        // Trusted events run microtask checkpoints between listeners; a timer waits for the whole dispatch.
        setTimeout(() => {
          entry.defaultPrevented = read(() => event.defaultPrevented)
          printLog(log, events)
        }, 0)
      }
      events.push(entry)
      printLog(log, events)
    }
    if (field) {
      field.addEventListener(type, listener)
    } else {
      document.addEventListener(type, listener, true)
    }
  }
  window.__field = () =>
    field ?? document.querySelector<HTMLElement>(TEXT_FIELD_SELECTOR)
  window.__selection = () => {
    const currentField = window.__field()
    const selection = fieldSelection(currentField)
    return currentField && selection
      ? {text: fieldText(currentField), ...selection}
      : null
  }
  window.__state = field
    ? () => ({
        text: getText(),
        events,
        ...(getState ? {state: getState()} : {}),
      })
    : () => {
        const fallback = window.__field()
        return {
          text: getText(),
          dom: fallback ? fieldText(fallback) : undefined,
          events,
          ...(getState ? {state: getState()} : {}),
        }
      }
}

function read<Value>(getValue: () => Value): Value | null {
  try {
    return getValue()
  } catch {
    return null
  }
}

function fieldSelection(field: HTMLElement | null) {
  if (!field) {
    return null
  }
  if (
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement
  ) {
    const backward = field.selectionDirection === 'backward'
    return {
      anchor: backward ? field.selectionEnd : field.selectionStart,
      focus: backward ? field.selectionStart : field.selectionEnd,
    }
  }
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) {
    return null
  }
  const anchor = fieldOffset(
    field,
    selection.anchorNode,
    selection.anchorOffset,
  )
  const focus = fieldOffset(field, selection.focusNode, selection.focusOffset)
  return anchor === null || focus === null ? null : {anchor, focus}
}

function fieldOffset(
  field: HTMLElement | null,
  node: Node | null,
  offset: number,
): number | null {
  if (!field || !node || !field.contains(node)) {
    return null
  }
  const range = document.createRange()
  range.setStart(field, 0)
  range.setEnd(node, offset)
  return range.toString().length
}

function fieldText(field: HTMLElement): string | null {
  if (
    field instanceof HTMLTextAreaElement ||
    field instanceof HTMLInputElement
  ) {
    return field.value
  }
  return field.textContent
}

function printLog(
  log: HTMLElement | null,
  events: Array<Record<string, unknown>>,
): void {
  if (log) {
    log.textContent = events.map((entry) => JSON.stringify(entry)).join('\n')
  }
}
