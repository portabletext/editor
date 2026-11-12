import {TEXT_FIELD_SELECTOR} from '../page.ts'

// A navigation can commit after the driver's readiness check passed on the old document, and an unnamed
// field can be re-rendered: `cdpEval` picks the first page target with the URL and has no document identity.
// So each expression looks the field up itself and returns `null` without one, which the driver waits out.
// Until the new document installs `window.__field()`, the expressions run this query, which cannot see a
// field the page names.
const FIELD = `(typeof window.__field === 'function' ? window.__field() : document.querySelector('${TEXT_FIELD_SELECTOR}'))`

export const FIELD_RECT = `(() => { const field = ${FIELD}; if (field === null) return null; field.style.minHeight = '50vh'; const rect = field.getBoundingClientRect(); return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, devicePixelRatio, innerHeight, screenHeight: screen.height}; })()`

export const FOCUS_FIELD = `(() => { const field = ${FIELD}; if (field === null) return null; field.focus(); if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) { field.setSelectionRange(field.value.length, field.value.length); return; } const range = document.createRange(); range.selectNodeContents(field); range.collapse(false); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); })()`

export const FIELD_FOCUSED = `(() => { const field = ${FIELD}; return field !== null && document.activeElement !== null && field.contains(document.activeElement); })()`

/** True once the field accepts input: an enabled form control, or a `contenteditable` that is editable now (an editor stays read-only until its first value is in). */
export const FIELD_EDITABLE = `(() => { const field = ${FIELD}; if (field === null) return false; if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) return !field.disabled && !field.readOnly; return field.isContentEditable; })()`
