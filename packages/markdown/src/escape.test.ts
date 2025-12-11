import {describe, expect, test} from 'vitest'
import {
  escapeImageAndLinkText,
  escapeImageAndLinkTitle,
  unescapeImageAndLinkText,
} from './escape'

describe(escapeImageAndLinkText.name, () => {
  test('escapes brackets', () => {
    expect(escapeImageAndLinkText('a[b]c')).toBe('a\\[b\\]c')
  })

  test('escapes backslash', () => {
    expect(escapeImageAndLinkText('a\\b')).toBe('a\\\\b')
  })

  test('escapes backslash before bracket', () => {
    expect(escapeImageAndLinkText('a\\]b')).toBe('a\\\\\\]b')
  })

  test('leaves other characters unchanged', () => {
    expect(escapeImageAndLinkText('hello world!')).toBe('hello world!')
  })
})

describe(unescapeImageAndLinkText.name, () => {
  test('unescapes brackets', () => {
    expect(unescapeImageAndLinkText('a\\[b\\]c')).toBe('a[b]c')
  })

  test('unescapes backslash', () => {
    expect(unescapeImageAndLinkText('a\\\\b')).toBe('a\\b')
  })

  test('unescapes all ASCII punctuation', () => {
    expect(unescapeImageAndLinkText('\\!\\#\\*')).toBe('!#*')
  })

  test('leaves non-escaped characters unchanged', () => {
    expect(unescapeImageAndLinkText('hello world')).toBe('hello world')
  })

  test('leaves backslash before non-punctuation unchanged', () => {
    expect(unescapeImageAndLinkText('a\\bc')).toBe('a\\bc')
  })
})

describe(escapeImageAndLinkTitle.name, () => {
  test('escapes double quotes', () => {
    expect(escapeImageAndLinkTitle('My "Cool" Page')).toBe('My \\"Cool\\" Page')
  })

  test('escapes backslash', () => {
    expect(escapeImageAndLinkTitle('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  test('leaves other characters unchanged', () => {
    expect(escapeImageAndLinkTitle('Hello World!')).toBe('Hello World!')
  })
})
