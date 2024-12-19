import {expect, test} from 'vitest'
import {looksLikeUrl} from './looks-like-url'

test(looksLikeUrl.name, () => {
  expect(looksLikeUrl('https://example.com')).toBe(true)
  expect(looksLikeUrl('http://example.com')).toBe(true)
  expect(looksLikeUrl('example.com')).toBe(true)
  expect(looksLikeUrl('mailto:foo@example.com')).toBe(true)
  expect(looksLikeUrl('tel:+123456789')).toBe(true)
  expect(looksLikeUrl('http://example')).toBe(false)
  expect(looksLikeUrl('http:example')).toBe(false)
  expect(looksLikeUrl('a:b')).toBe(false)
})
