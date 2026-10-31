declare global {
  interface Window {
    __state: () => unknown
  }
}

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
 * Without `field`, events are recorded on `document` in the capture phase, so the field may render
 * later, and `window.__state()` returns `{text, dom, events}`, `dom` being the first
 * `[contenteditable]`'s `textContent`. With `field`, events are recorded on the field with its
 * `textContent` at each event, and `window.__state()` returns `{text, events}`.
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
  /** The field to record on, for a page with no editor model of its own. */
  field?: HTMLElement
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
          text: field.textContent,
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
  window.__state = field
    ? () => ({text: getText(), events})
    : () => ({
        text: getText(),
        dom: document.querySelector('[contenteditable]')?.textContent,
        events,
      })
}

function printLog(
  log: HTMLElement | null,
  events: Array<Record<string, unknown>>,
): void {
  if (log) {
    log.textContent = events.map((entry) => JSON.stringify(entry)).join('\n')
  }
}
