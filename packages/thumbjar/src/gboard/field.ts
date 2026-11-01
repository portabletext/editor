import {TEXT_FIELD_SELECTOR} from '../page.ts'

// The driver waits for `recordInput` after the initial load and the reopen before the field lookup, but a
// navigation can still commit after that check passed on the old document: `cdpEval` picks the first page
// target with the URL and has no document identity. Until the new document installs `window.__field()`,
// the expressions run this query, which cannot see a field the page names.
const FIELD = `(typeof window.__field === 'function' ? window.__field() : document.querySelector('${TEXT_FIELD_SELECTOR}'))`

export const FIELD_RECT = `(() => { const field = ${FIELD}; field.style.minHeight = '50vh'; const rect = field.getBoundingClientRect(); return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, devicePixelRatio, innerHeight, screenHeight: screen.height}; })()`

export const FOCUS_FIELD = `(() => { const field = ${FIELD}; field.focus(); if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) { field.setSelectionRange(field.value.length, field.value.length); return; } const range = document.createRange(); range.selectNodeContents(field); range.collapse(false); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); })()`

export const FIELD_FOCUSED = `(() => { const field = ${FIELD}; return field !== null && document.activeElement !== null && field.contains(document.activeElement); })()`
