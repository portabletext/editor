/// <reference lib="dom" />
import {FOCUS_FIELD} from '../gboard/field.ts'

// `FOCUS_FIELD` returns `undefined` on success and WebDriver serializes that as `null`, so compare in the page.
export const focusField = `return (${FOCUS_FIELD}) !== null`

export function readyField(): HTMLElement | null {
  return typeof window.__state === 'function' &&
    typeof window.__field === 'function'
    ? window.__field()
    : null
}
