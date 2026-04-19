import {describe, expect, test} from 'vitest'
import {compareSpecificity} from './compare-specificity'
import {parseScope} from './parse-scope'

function parse(scope: string) {
  const parsed = parseScope(scope)
  if (!parsed) {
    throw new Error(`Test setup error: scope "${scope}" failed to parse`)
  }
  return parsed
}

describe(compareSpecificity.name, () => {
  describe('rule 1: root-anchored beats descendant', () => {
    test('root-anchored vs descendant, same chain', () => {
      expect(compareSpecificity(parse('$.block'), parse('$..block'))).toBe(1)
      expect(compareSpecificity(parse('$..block'), parse('$.block'))).toBe(-1)
    })

    test('root-anchored wins over longer descendant', () => {
      expect(
        compareSpecificity(parse('$.block'), parse('$..callout.block')),
      ).toBe(1)
    })

    test('root-anchored wins over all-exact descendant', () => {
      expect(compareSpecificity(parse('$.block'), parse('$..block'))).toBe(1)
    })
  })

  describe('rule 2: longer chain beats shorter when anchor matches', () => {
    test('both descendant, different lengths', () => {
      expect(
        compareSpecificity(
          parse('$..callout.block.span'),
          parse('$..block.span'),
        ),
      ).toBe(1)
      expect(
        compareSpecificity(
          parse('$..block.span'),
          parse('$..callout.block.span'),
        ),
      ).toBe(-1)
    })

    test('both root-anchored, different lengths', () => {
      expect(
        compareSpecificity(
          parse('$.callout.block.span'),
          parse('$.block.span'),
        ),
      ).toBe(1)
    })
  })

  describe('rule 3: more exact segments beat fewer when anchor and length match', () => {
    test('middle any-descent loses to exact chain', () => {
      expect(
        compareSpecificity(
          parse('$..callout.block.span'),
          parse('$..callout..block.span'),
        ),
      ).toBe(1)
    })

    test('two exact-chain segments beat one', () => {
      expect(
        compareSpecificity(
          parse('$..table..row.cell'),
          parse('$..table..row..cell'),
        ),
      ).toBe(1)
    })
  })

  describe('equal specificity', () => {
    test('identical scopes', () => {
      expect(
        compareSpecificity(parse('$..block.span'), parse('$..block.span')),
      ).toBe(0)
    })

    test('different terminal types, same shape', () => {
      expect(
        compareSpecificity(parse('$..block.span'), parse('$..block.image')),
      ).toBe(0)
    })
  })

  describe('rule ordering: anchor beats length', () => {
    test('short root-anchored beats long descendant', () => {
      expect(
        compareSpecificity(
          parse('$.block'),
          parse('$..table.row.cell.block.span'),
        ),
      ).toBe(1)
    })
  })

  describe('rule ordering: length beats exact-count', () => {
    test('longer chain wins even with fewer exact segments', () => {
      expect(
        compareSpecificity(
          parse('$..callout..block..span'),
          parse('$..block.span'),
        ),
      ).toBe(1)
    })
  })

  describe('worked example from spec', () => {
    test('C (root + longest) > B (longer descendant) > A (shorter descendant)', () => {
      const shortestDescendant = parse('$..block.span')
      const longerDescendant = parse('$..callout.block.span')
      const rootAnchored = parse('$.callout.block.span')

      expect(compareSpecificity(rootAnchored, longerDescendant)).toBe(1)
      expect(compareSpecificity(longerDescendant, shortestDescendant)).toBe(1)
      expect(compareSpecificity(rootAnchored, shortestDescendant)).toBe(1)

      expect(compareSpecificity(longerDescendant, rootAnchored)).toBe(-1)
      expect(compareSpecificity(shortestDescendant, longerDescendant)).toBe(-1)
      expect(compareSpecificity(shortestDescendant, rootAnchored)).toBe(-1)
    })
  })

  describe('sortable via Array.sort', () => {
    test('ascending sort yields least-to-most specific', () => {
      const scopes = [
        parse('$..block.span'),
        parse('$.callout.block.span'),
        parse('$..callout.block.span'),
      ]

      const sorted = [...scopes].sort(compareSpecificity)

      expect(sorted).toEqual([
        parse('$..block.span'),
        parse('$..callout.block.span'),
        parse('$.callout.block.span'),
      ])
    })
  })
})
