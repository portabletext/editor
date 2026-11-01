declare global {
  interface Window {
    __state: () => unknown
    __field: () => HTMLElement | null
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
 * Each recorded event is also printed to a `#log` element when the page has one.
 *
 * @example
 * ```ts
 * recordInput({getText: () => editorText(editor.getSnapshot())})
 * ```
 */
export function recordInput({
  getText,
  field,
}: {
  /** The text `window.__state()` reports, read when the driver calls it. */
  getText: () => string | null
  /** The field to type into and record on, for a page with no editor model of its own. */
  field?: HTMLElement | HTMLTextAreaElement | HTMLInputElement
}): void {
  const events: Array<Record<string, unknown>> = []
  const log = document.getElementById('log')
  for (const type of EVENT_TYPES) {
    if (field) {
      field.addEventListener(type, (event) => {
        events.push({
          type,
          inputType: event instanceof InputEvent ? event.inputType : undefined,
          data:
            event instanceof InputEvent || event instanceof CompositionEvent
              ? event.data
              : undefined,
          text: fieldText(field),
        })
        printLog(log, events)
      })
    } else {
      document.addEventListener(
        type,
        (event) => {
          events.push({
            type,
            inputType:
              event instanceof InputEvent ? event.inputType : undefined,
            data:
              event instanceof InputEvent || event instanceof CompositionEvent
                ? event.data
                : undefined,
          })
          printLog(log, events)
        },
        true,
      )
    }
  }
  window.__field = () =>
    field ?? document.querySelector<HTMLElement>(TEXT_FIELD_SELECTOR)
  window.__state = field
    ? () => ({text: getText(), events})
    : () => {
        const fallback = window.__field()
        return {
          text: getText(),
          dom: fallback ? fieldText(fallback) : undefined,
          events,
        }
      }
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
