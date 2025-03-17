import {expect, test} from 'vitest'
import {stringOverlap} from './string-overlap'

test(stringOverlap.name, () => {
  expect(stringOverlap('', 'foobar')).toBe('')
  expect(stringOverlap('foo ', 'o bar b')).toBe('o ')
  expect(stringOverlap('foo', 'o')).toBe('o')
  expect(stringOverlap('foo bar baz', 'o')).toBe('o')
  expect(stringOverlap('bar', 'o bar b')).toBe('bar')
  expect(stringOverlap(' baz', 'o bar b')).toBe(' b')
  expect(stringOverlap('fofofo', 'fo')).toBe('fo')
  expect(stringOverlap('fofofo', 'fof')).toBe('fof')
  expect(stringOverlap('fofofo', 'fofofof')).toBe('fofofo')
})
