import {expect, test} from 'vitest'
import {getTextToBold, getTextToItalic} from './get-text-to-emphasize'

test(getTextToItalic.name, () => {
  expect(getTextToItalic('Hello *world*')).toBe('*world*')
  expect(getTextToItalic('Hello _world_')).toBe('_world_')
  expect(getTextToItalic('*Hello*world*')).toBe('*world*')
  expect(getTextToItalic('_Hello_world_')).toBe('_world_')

  expect(getTextToItalic('* Hello world *')).toBe(undefined)
  expect(getTextToItalic('* Hello world*')).toBe(undefined)
  expect(getTextToItalic('*Hello world *')).toBe(undefined)
  expect(getTextToItalic('_ Hello world _')).toBe(undefined)
  expect(getTextToItalic('_ Hello world_')).toBe(undefined)
  expect(getTextToItalic('_Hello world _')).toBe(undefined)

  expect(getTextToItalic('Hello *world')).toBe(undefined)
  expect(getTextToItalic('Hello world*')).toBe(undefined)
  expect(getTextToItalic('Hello *world* *')).toBe(undefined)

  expect(getTextToItalic('_Hello*world_')).toBe('_Hello*world_')
  expect(getTextToItalic('*Hello_world*')).toBe('*Hello_world*')

  expect(getTextToItalic('*hello\nworld*')).toBe(undefined)
  expect(getTextToItalic('_hello\nworld_')).toBe(undefined)

  expect(getTextToItalic('*')).toBe(undefined)
  expect(getTextToItalic('_')).toBe(undefined)
  expect(getTextToItalic('**')).toBe(undefined)
  expect(getTextToItalic('__')).toBe(undefined)
})

test(getTextToBold.name, () => {
  expect(getTextToBold('Hello **world**')).toBe('**world**')
  expect(getTextToBold('Hello __world__')).toBe('__world__')
  expect(getTextToBold('**Hello**world**')).toBe('**world**')
  expect(getTextToBold('__Hello__world__')).toBe('__world__')

  expect(getTextToBold('** Hello world **')).toBe(undefined)
  expect(getTextToBold('** Hello world**')).toBe(undefined)
  expect(getTextToBold('**Hello world **')).toBe(undefined)
  expect(getTextToBold('__ Hello world __')).toBe(undefined)
  expect(getTextToBold('__ Hello world__')).toBe(undefined)
  expect(getTextToBold('__Hello world __')).toBe(undefined)

  expect(getTextToBold('Hello **world')).toBe(undefined)
  expect(getTextToBold('Hello world**')).toBe(undefined)
  expect(getTextToBold('Hello **world** **')).toBe(undefined)

  expect(getTextToBold('__Hello**world__')).toBe('__Hello**world__')
  expect(getTextToBold('**Hello__world**')).toBe('**Hello__world**')

  expect(getTextToBold('**hello\nworld**')).toBe(undefined)
  expect(getTextToBold('__hello\nworld__')).toBe(undefined)

  expect(getTextToBold('**')).toBe(undefined)
  expect(getTextToBold('__')).toBe(undefined)
  expect(getTextToBold('****')).toBe(undefined)
  expect(getTextToBold('____')).toBe(undefined)
})
