// @vitest-environment jsdom
import {describe, expect, test} from 'vitest'
import {recordInput} from './page.ts'

describe(recordInput.name, () => {
  test('records the value of a textarea the page names', () => {
    document.body.innerHTML =
      '<div contenteditable="true"></div><textarea></textarea>'
    const field = document.querySelector('textarea')!
    recordInput({getText: () => field.value, field})

    field.value = 'foo'
    field.dispatchEvent(
      new InputEvent('input', {inputType: 'insertText', data: 'foo'}),
    )

    expect(window.__state()).toEqual({
      text: 'foo',
      events: [
        {type: 'input', inputType: 'insertText', data: 'foo', text: 'foo'},
      ],
    })
  })

  test('records the value of a text input the page names', () => {
    document.body.innerHTML = '<input type="text" />'
    const field = document.querySelector('input')!
    recordInput({getText: () => field.value, field})

    field.value = 'bar'
    field.dispatchEvent(
      new InputEvent('input', {inputType: 'insertText', data: 'bar'}),
    )

    expect(window.__state()).toEqual({
      text: 'bar',
      events: [
        {type: 'input', inputType: 'insertText', data: 'bar', text: 'bar'},
      ],
    })
  })

  test('reports the value of the first textarea as `dom` when the page names no field', () => {
    document.body.innerHTML =
      '<textarea>foo</textarea><div contenteditable="true">bar</div>'
    recordInput({getText: () => null})

    expect(window.__state()).toEqual({text: null, dom: 'foo', events: []})
  })

  test.for(['checkbox', 'hidden', 'button'])(
    'skips an input of type %s for `dom` when the page names no field',
    (type) => {
      document.body.innerHTML = `<input type="${type}" value="bar" /><textarea>foo</textarea>`
      recordInput({getText: () => null})

      expect(window.__state()).toEqual({text: null, dom: 'foo', events: []})
    },
  )
})
