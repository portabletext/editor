import {describe, expect, test} from 'vitest'
import {parseScope} from './parse-scope'

describe(parseScope.name, () => {
  describe('accepts valid scopes', () => {
    test('root-anchored single segment', () => {
      expect(parseScope('$.block')).toEqual({
        anchor: '$.',
        segments: [{type: 'block', descent: 'exact'}],
      })
    })

    test('descendant single segment', () => {
      expect(parseScope('$..block')).toEqual({
        anchor: '$..',
        segments: [{type: 'block', descent: 'any'}],
      })
    })

    test('root-anchored exact chain', () => {
      expect(parseScope('$.callout.block.span')).toEqual({
        anchor: '$.',
        segments: [
          {type: 'callout', descent: 'exact'},
          {type: 'block', descent: 'exact'},
          {type: 'span', descent: 'exact'},
        ],
      })
    })

    test('descendant exact chain', () => {
      expect(parseScope('$..callout.block.span')).toEqual({
        anchor: '$..',
        segments: [
          {type: 'callout', descent: 'any'},
          {type: 'block', descent: 'exact'},
          {type: 'span', descent: 'exact'},
        ],
      })
    })

    test('descendant with middle any-descent', () => {
      expect(parseScope('$..table..span')).toEqual({
        anchor: '$..',
        segments: [
          {type: 'table', descent: 'any'},
          {type: 'span', descent: 'any'},
        ],
      })
    })

    test('root-anchored with middle any-descent', () => {
      expect(parseScope('$.callout..span')).toEqual({
        anchor: '$.',
        segments: [
          {type: 'callout', descent: 'exact'},
          {type: 'span', descent: 'any'},
        ],
      })
    })

    test('multiple middle any-descents', () => {
      expect(parseScope('$..table..row..cell..span')).toEqual({
        anchor: '$..',
        segments: [
          {type: 'table', descent: 'any'},
          {type: 'row', descent: 'any'},
          {type: 'cell', descent: 'any'},
          {type: 'span', descent: 'any'},
        ],
      })
    })

    test('mixed exact and any descents', () => {
      expect(parseScope('$..callout..block.span')).toEqual({
        anchor: '$..',
        segments: [
          {type: 'callout', descent: 'any'},
          {type: 'block', descent: 'any'},
          {type: 'span', descent: 'exact'},
        ],
      })
    })

    test('type names with hyphens', () => {
      expect(parseScope('$..block.stock-ticker')).toEqual({
        anchor: '$..',
        segments: [
          {type: 'block', descent: 'any'},
          {type: 'stock-ticker', descent: 'exact'},
        ],
      })
    })

    test('type names with underscores', () => {
      expect(parseScope('$..block_quote')).toEqual({
        anchor: '$..',
        segments: [{type: 'block_quote', descent: 'any'}],
      })
    })

    test('type names with digits after initial letter', () => {
      expect(parseScope('$..h1')).toEqual({
        anchor: '$..',
        segments: [{type: 'h1', descent: 'any'}],
      })
    })
  })

  describe('rejects syntactically invalid scopes', () => {
    test('empty string', () => {
      expect(parseScope('')).toBe(null)
    })

    test('root alone', () => {
      expect(parseScope('$')).toBe(null)
    })

    test('root-anchor alone', () => {
      expect(parseScope('$.')).toBe(null)
    })

    test('descendant-anchor alone', () => {
      expect(parseScope('$..')).toBe(null)
    })

    test('bare segment without anchor', () => {
      expect(parseScope('block')).toBe(null)
    })

    test('bare chain without anchor', () => {
      expect(parseScope('block.span')).toBe(null)
    })

    test('dollar without dot', () => {
      expect(parseScope('$block')).toBe(null)
    })

    test('three consecutive dots', () => {
      expect(parseScope('$...block')).toBe(null)
    })

    test('trailing dot', () => {
      expect(parseScope('$..block.')).toBe(null)
    })

    test('trailing double dot', () => {
      expect(parseScope('$..block..')).toBe(null)
    })

    test('segment starting with digit', () => {
      expect(parseScope('$..123')).toBe(null)
    })

    test('segment starting with hyphen', () => {
      expect(parseScope('$..-block')).toBe(null)
    })

    test('segment starting with underscore', () => {
      expect(parseScope('$.._block')).toBe(null)
    })

    test('segment with space', () => {
      expect(parseScope('$..block quote')).toBe(null)
    })

    test('segment with dollar', () => {
      expect(parseScope('$..block$extra')).toBe(null)
    })

    test('segment with slash', () => {
      expect(parseScope('$..block/child')).toBe(null)
    })

    test('empty segment between dots', () => {
      expect(parseScope('$..block...span')).toBe(null)
    })

    test('leading dot without dollar', () => {
      expect(parseScope('.block')).toBe(null)
    })
  })
})
