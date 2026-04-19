import {describe, expect, test} from 'vitest'
import {matchScope} from './match-scope'
import {parseScope} from './parse-scope'

function parse(scope: string) {
  const parsed = parseScope(scope)
  if (!parsed) {
    throw new Error(`Test setup error: scope "${scope}" failed to parse`)
  }
  return parsed
}

describe(matchScope.name, () => {
  describe('root-anchored single segment', () => {
    test('matches root block', () => {
      expect(matchScope(parse('$.block'), ['block'])).toBe(true)
    })

    test('does not match nested block', () => {
      expect(matchScope(parse('$.block'), ['callout', 'block'])).toBe(false)
    })

    test('does not match when terminal type differs', () => {
      expect(matchScope(parse('$.block'), ['callout'])).toBe(false)
    })
  })

  describe('descendant single segment', () => {
    test('matches root block', () => {
      expect(matchScope(parse('$..block'), ['block'])).toBe(true)
    })

    test('matches nested block', () => {
      expect(matchScope(parse('$..block'), ['callout', 'block'])).toBe(true)
    })

    test('matches deeply nested block', () => {
      expect(
        matchScope(parse('$..block'), ['table', 'row', 'cell', 'block']),
      ).toBe(true)
    })

    test('does not match when terminal type differs', () => {
      expect(matchScope(parse('$..block'), ['callout', 'span'])).toBe(false)
    })

    test('does not match when type is not terminal', () => {
      expect(matchScope(parse('$..block'), ['block', 'span'])).toBe(false)
    })
  })

  describe('root-anchored exact chain', () => {
    test('matches exact path from root', () => {
      expect(
        matchScope(parse('$.callout.block.span'), ['callout', 'block', 'span']),
      ).toBe(true)
    })

    test('does not match when chain is deeper than scope', () => {
      expect(
        matchScope(parse('$.callout.block.span'), [
          'table',
          'callout',
          'block',
          'span',
        ]),
      ).toBe(false)
    })

    test('does not match when intermediate type differs', () => {
      expect(
        matchScope(parse('$.callout.block.span'), ['callout', 'list', 'span']),
      ).toBe(false)
    })

    test('does not match when root type differs', () => {
      expect(
        matchScope(parse('$.callout.block.span'), ['table', 'block', 'span']),
      ).toBe(false)
    })
  })

  describe('descendant exact chain', () => {
    test('matches at root', () => {
      expect(
        matchScope(parse('$..callout.block.span'), [
          'callout',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('matches nested', () => {
      expect(
        matchScope(parse('$..callout.block.span'), [
          'table',
          'callout',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('matches deeply nested', () => {
      expect(
        matchScope(parse('$..callout.block.span'), [
          'table',
          'row',
          'cell',
          'callout',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('does not match when exact chain is broken', () => {
      expect(
        matchScope(parse('$..callout.block.span'), [
          'callout',
          'list',
          'block',
          'span',
        ]),
      ).toBe(false)
    })
  })

  describe('middle any-descent', () => {
    test('any-descent spans intermediate segments', () => {
      expect(
        matchScope(parse('$..table..span'), [
          'table',
          'row',
          'cell',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('any-descent spans zero intermediate segments', () => {
      expect(matchScope(parse('$..table..span'), ['table', 'span'])).toBe(true)
    })

    test('any-descent requires the ancestor to appear', () => {
      expect(
        matchScope(parse('$..table..span'), ['callout', 'block', 'span']),
      ).toBe(false)
    })

    test('any-descent followed by exact chain', () => {
      expect(
        matchScope(parse('$..callout..block.span'), [
          'callout',
          'list',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('any-descent followed by exact chain requires adjacency after descent', () => {
      expect(
        matchScope(parse('$..callout..block.span'), [
          'callout',
          'block',
          'list',
          'span',
        ]),
      ).toBe(false)
    })

    test('multiple any-descents', () => {
      expect(
        matchScope(parse('$..table..row..cell..span'), [
          'table',
          'foo',
          'row',
          'bar',
          'cell',
          'baz',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('root-anchored with middle any-descent', () => {
      expect(
        matchScope(parse('$.callout..span'), ['callout', 'block', 'span']),
      ).toBe(true)
    })

    test('root-anchored with middle any-descent rejects non-root callout', () => {
      expect(
        matchScope(parse('$.callout..span'), [
          'table',
          'callout',
          'block',
          'span',
        ]),
      ).toBe(false)
    })
  })

  describe('terminal constraint', () => {
    test('does not match when scope is shorter than typePath and terminal is not last', () => {
      expect(
        matchScope(parse('$..callout'), ['callout', 'block', 'span']),
      ).toBe(false)
    })

    test('does not match when scope is longer than typePath', () => {
      expect(
        matchScope(parse('$..callout.block.span'), ['block', 'span']),
      ).toBe(false)
    })

    test('empty typePath rejects any scope', () => {
      expect(matchScope(parse('$.block'), [])).toBe(false)
      expect(matchScope(parse('$..block'), [])).toBe(false)
    })
  })

  describe('worked examples from spec', () => {
    test('spec example: span in callout-block, various scopes', () => {
      const typePath = ['callout', 'block', 'span']
      expect(matchScope(parse('$..block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$.block.span'), typePath)).toBe(false)
      expect(matchScope(parse('$..callout.block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$.callout.block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$..callout..block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$..table.block.span'), typePath)).toBe(false)
      expect(matchScope(parse('$..block'), typePath)).toBe(false)
    })

    test('spec example: span in root block', () => {
      const typePath = ['block', 'span']
      expect(matchScope(parse('$.block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$..block.span'), typePath)).toBe(true)
      expect(matchScope(parse('$..callout.block.span'), typePath)).toBe(false)
    })

    test('spec example: gallery image', () => {
      const typePath = ['gallery', 'image']
      expect(matchScope(parse('$..image'), typePath)).toBe(true)
      expect(matchScope(parse('$..gallery.image'), typePath)).toBe(true)
      expect(matchScope(parse('$.gallery.image'), typePath)).toBe(true)
      expect(matchScope(parse('$.image'), typePath)).toBe(false)
    })

    test('spec example: root image', () => {
      const typePath = ['image']
      expect(matchScope(parse('$.image'), typePath)).toBe(true)
      expect(matchScope(parse('$..image'), typePath)).toBe(true)
      expect(matchScope(parse('$..gallery.image'), typePath)).toBe(false)
    })
  })
})
