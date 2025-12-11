import {describe, expect, test} from 'vitest'
import {escapeAltAndLinkText, escapeTitle, unescapeAltText} from './escape'

describe(escapeAltAndLinkText.name, () => {
  test('escapes brackets', () => {
    expect(escapeAltAndLinkText('a[b]c')).toBe('a\\[b\\]c')
  })

  test('escapes backslash', () => {
    expect(escapeAltAndLinkText('a\\b')).toBe('a\\\\b')
  })

  test('escapes backslash before bracket', () => {
    expect(escapeAltAndLinkText('a\\]b')).toBe('a\\\\\\]b')
  })

  test('leaves other characters unchanged', () => {
    expect(escapeAltAndLinkText('hello world!')).toBe('hello world!')
  })
})

describe(unescapeAltText.name, () => {
  test('unescapes brackets', () => {
    expect(unescapeAltText('a\\[b\\]c')).toBe('a[b]c')
  })

  test('unescapes backslash', () => {
    expect(unescapeAltText('a\\\\b')).toBe('a\\b')
  })

  test('unescapes all ASCII punctuation', () => {
    expect(unescapeAltText('\\!\\#\\*')).toBe('!#*')
  })

  test('leaves non-escaped characters unchanged', () => {
    expect(unescapeAltText('hello world')).toBe('hello world')
  })

  test('leaves backslash before non-punctuation unchanged', () => {
    expect(unescapeAltText('a\\bc')).toBe('a\\bc')
  })
})

describe(escapeTitle.name, () => {
  test('escapes double quotes', () => {
    expect(escapeTitle('My "Cool" Page')).toBe('My \\"Cool\\" Page')
  })

  test('escapes backslash', () => {
    expect(escapeTitle('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  test('leaves other characters unchanged', () => {
    expect(escapeTitle('Hello World!')).toBe('Hello World!')
  })
})
