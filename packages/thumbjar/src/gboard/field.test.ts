// @vitest-environment jsdom
import {beforeEach, expect, test} from 'vitest'
import {recordInput} from '../page.ts'
import {FIELD_FOCUSED, FIELD_RECT, FOCUS_FIELD} from './field.ts'

beforeEach(() => {
  Reflect.deleteProperty(window, '__field')
})

test('the driver taps and focuses the textarea the page names, with the caret after its text', () => {
  document.body.innerHTML =
    '<div contenteditable="true"></div><textarea>foo</textarea>'
  document.querySelector('div')!.getBoundingClientRect = () =>
    new DOMRect(0, 0, 10, 10)
  const field = document.querySelector('textarea')!
  field.getBoundingClientRect = () => new DOMRect(10, 20, 200, 80)
  recordInput({getText: () => field.value, field})

  const rect = evaluate(FIELD_RECT)
  const focusedBefore = evaluate(FIELD_FOCUSED)
  evaluate(FOCUS_FIELD)

  expect({
    rect,
    minHeight: field.style.minHeight,
    focusedBefore,
    focused: evaluate(FIELD_FOCUSED),
    activeElement: document.activeElement,
    selection: [field.selectionStart, field.selectionEnd],
  }).toEqual({
    rect: {
      x: 110,
      y: 60,
      devicePixelRatio: 1,
      innerHeight: 768,
      screenHeight: 0,
    },
    minHeight: '50vh',
    focusedBefore: false,
    focused: true,
    activeElement: field,
    selection: [3, 3],
  })
})

test('the driver focuses the first text input when the page names no field', () => {
  document.body.innerHTML =
    '<input type="text" value="foo" /><div contenteditable="true"></div>'
  recordInput({getText: () => null})
  const field = document.querySelector('input')!

  evaluate(FOCUS_FIELD)

  expect({
    focused: evaluate(FIELD_FOCUSED),
    activeElement: document.activeElement,
    selection: [field.selectionStart, field.selectionEnd],
  }).toEqual({focused: true, activeElement: field, selection: [3, 3]})
})

test.for(['checkbox', 'hidden', 'button'])(
  'the driver skips an input of type %s before the textarea when the page names no field',
  (type) => {
    document.body.innerHTML = `<input type="${type}" value="bar" /><textarea>foo</textarea>`
    document.querySelector('input')!.getBoundingClientRect = () =>
      new DOMRect(0, 0, 10, 10)
    const field = document.querySelector('textarea')!
    field.getBoundingClientRect = () => new DOMRect(10, 20, 200, 80)
    recordInput({getText: () => null})

    const rect = evaluate(FIELD_RECT)
    evaluate(FOCUS_FIELD)

    expect({
      rect,
      focused: evaluate(FIELD_FOCUSED),
      activeElement: document.activeElement,
      selection: [field.selectionStart, field.selectionEnd],
    }).toEqual({
      rect: {
        x: 110,
        y: 60,
        devicePixelRatio: 1,
        innerHeight: 768,
        screenHeight: 0,
      },
      focused: true,
      activeElement: field,
      selection: [3, 3],
    })
  },
)

test('the driver finds the field in a document that has not called `recordInput` yet', () => {
  document.body.innerHTML = '<input type="checkbox" /><textarea>foo</textarea>'
  const field = document.querySelector('textarea')!
  field.getBoundingClientRect = () => new DOMRect(10, 20, 200, 80)

  const rect = evaluate(FIELD_RECT)
  evaluate(FOCUS_FIELD)

  expect({
    rect,
    focused: evaluate(FIELD_FOCUSED),
    activeElement: document.activeElement,
    selection: [field.selectionStart, field.selectionEnd],
  }).toEqual({
    rect: {
      x: 110,
      y: 60,
      devicePixelRatio: 1,
      innerHeight: 768,
      screenHeight: 0,
    },
    focused: true,
    activeElement: field,
    selection: [3, 3],
  })
})

test('the field is not focused while another input has focus', () => {
  document.body.innerHTML = '<textarea>foo</textarea><input value="bar" />'
  const field = document.querySelector('textarea')!
  recordInput({getText: () => field.value, field})

  document.querySelector('input')!.focus()

  expect(evaluate(FIELD_FOCUSED)).toEqual(false)
})

test('the contenteditable is focused while an element inside it has focus', () => {
  document.body.innerHTML =
    '<div contenteditable="true"><p tabindex="0">foo</p></div>'
  recordInput({getText: () => null})

  document.querySelector('p')!.focus()

  expect(evaluate(FIELD_FOCUSED)).toEqual(true)
})

// The driver sends each expression to the page over CDP, where it runs as a script.
function evaluate(expression: string): unknown {
  return new Function(`return ${expression}`)()
}
