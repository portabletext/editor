// @vitest-environment jsdom
import {beforeEach, describe, expect, test} from 'vitest'
import {recordInput} from '../page.ts'
import {focusField, readyField} from './field.ts'

describe(readyField.name, () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Reflect.deleteProperty(window, '__field')
    Reflect.deleteProperty(window, '__state')
  })

  test('iOS finds a page with only a textarea', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    recordInput({getText: () => null})

    expect(readyField()).toEqual(document.querySelector('textarea'))
  })

  test('iOS finds a page with only a text input', () => {
    document.body.innerHTML = '<input type="text" value="foo" />'
    recordInput({getText: () => null})

    expect(readyField()).toEqual(document.querySelector('input'))
  })

  test('iOS waits for the page state function before finding its field', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    window.__field = () => document.querySelector('textarea')

    expect(readyField()).toEqual(null)
  })

  test('iOS waits for the field resolver', () => {
    document.body.innerHTML = '<textarea>foo</textarea>'
    window.__state = () => ({})

    expect(readyField()).toEqual(null)
  })

  test('iOS waits when the page has not rendered its field', () => {
    recordInput({getText: () => null})

    expect(readyField()).toEqual(null)
  })

  test('iOS finds the field named by the page', () => {
    document.body.innerHTML =
      '<textarea>foo</textarea><input type="text" value="bar" />'
    const field = document.querySelector('input')!
    recordInput({getText: () => field.value, field})

    expect(readyField()).toEqual(field)
  })
})

test('iOS focus returns true for a textarea before WebDriver serializes it', () => {
  document.body.innerHTML = '<textarea>foo</textarea>'
  const field = document.querySelector('textarea')!
  recordInput({getText: () => field.value, field})

  expect(new Function(focusField)()).toEqual(true)
  expect(document.activeElement).toEqual(field)
  expect([field.selectionStart, field.selectionEnd]).toEqual([3, 3])
})

test('iOS focus returns false when the page has no field', () => {
  document.body.innerHTML = ''
  recordInput({getText: () => null})

  expect(new Function(focusField)()).toEqual(false)
})

test('iOS focus returns true for a text input', () => {
  document.body.innerHTML = '<input type="text" value="foo" />'
  const field = document.querySelector('input')!
  recordInput({getText: () => field.value, field})

  expect(new Function(focusField)()).toEqual(true)
  expect(document.activeElement).toEqual(field)
  expect([field.selectionStart, field.selectionEnd]).toEqual([3, 3])
})

test('iOS focus returns true for a contenteditable', () => {
  document.body.innerHTML = '<div contenteditable="true" tabindex="0">foo</div>'
  const field = document.querySelector('div')!
  recordInput({getText: () => field.textContent, field})

  expect(new Function(focusField)()).toEqual(true)
  expect(document.activeElement).toEqual(field)
  expect(window.getSelection()?.isCollapsed).toEqual(true)
  expect(window.getSelection()?.anchorOffset).toEqual(1)
})
