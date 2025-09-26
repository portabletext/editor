import {expect, test} from 'vitest'
import {getTextToDoubleQuote, getTextToSingleQuote} from './get-text-to-quote'

test(getTextToSingleQuote.name, () => {
  expect(getTextToSingleQuote(`Hello 'world'`)).toBe(`'world'`)
  expect(getTextToSingleQuote(`'Hello'world'`)).toBe(`'world'`)

  expect(getTextToSingleQuote(`' Hello world '`)).toBe(undefined)
  expect(getTextToSingleQuote(`' Hello world'`)).toBe(undefined)
  expect(getTextToSingleQuote(`'Hello world '`)).toBe(undefined)

  expect(getTextToSingleQuote(`'Hello 'world`)).toBe(undefined)
  expect(getTextToSingleQuote(`Hello world'`)).toBe(undefined)
  expect(getTextToSingleQuote(`Hello 'world' '`)).toBe(undefined)

  expect(getTextToSingleQuote(`'hello\nworld'`)).toBe(undefined)

  expect(getTextToSingleQuote(`'`)).toBe(undefined)
  expect(getTextToSingleQuote(`''`)).toBe(undefined)
})

test(getTextToDoubleQuote.name, () => {
  expect(getTextToDoubleQuote('Hello "world"')).toBe('"world"')
  expect(getTextToDoubleQuote('"Hello"world"')).toBe('"world"')

  expect(getTextToDoubleQuote('" Hello world "')).toBe(undefined)
  expect(getTextToDoubleQuote('** Hello world**')).toBe(undefined)
  expect(getTextToDoubleQuote('**Hello world **')).toBe(undefined)

  expect(getTextToDoubleQuote('Hello **world')).toBe(undefined)
  expect(getTextToDoubleQuote('Hello world**')).toBe(undefined)
  expect(getTextToDoubleQuote('Hello **world** **')).toBe(undefined)

  expect(getTextToDoubleQuote('"hello\nworld"')).toBe(undefined)

  expect(getTextToDoubleQuote('"')).toBe(undefined)
  expect(getTextToDoubleQuote('""')).toBe(undefined)
})
