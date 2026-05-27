import {describe, expect, test} from 'vitest'
import {extractAlignmentFromStyleAttr} from './markdown-to-portable-text'

describe(extractAlignmentFromStyleAttr.name, () => {
  test('returns `left` for `text-align:left`', () => {
    expect(extractAlignmentFromStyleAttr('text-align:left')).toBe('left')
  })

  test('returns `center` for `text-align:center`', () => {
    expect(extractAlignmentFromStyleAttr('text-align:center')).toBe('center')
  })

  test('returns `right` for `text-align:right`', () => {
    expect(extractAlignmentFromStyleAttr('text-align:right')).toBe('right')
  })

  test('returns `null` for `null`', () => {
    expect(extractAlignmentFromStyleAttr(null)).toBeNull()
  })

  test('returns `null` for the empty string', () => {
    expect(extractAlignmentFromStyleAttr('')).toBeNull()
  })

  test('returns `null` for a `style` value without `text-align`', () => {
    expect(extractAlignmentFromStyleAttr('background-color:red')).toBeNull()
  })

  test('tolerates whitespace around the colon', () => {
    expect(extractAlignmentFromStyleAttr('text-align : center')).toBe('center')
  })

  test('reads `text-align` alongside other declarations', () => {
    expect(
      extractAlignmentFromStyleAttr(
        'background-color:red;text-align:right;color:blue',
      ),
    ).toBe('right')
  })

  test('returns `null` for unknown `text-align` keywords', () => {
    expect(extractAlignmentFromStyleAttr('text-align:justify')).toBeNull()
  })
})
