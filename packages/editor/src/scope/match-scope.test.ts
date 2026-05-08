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

  describe('self-referential nesting', () => {
    test('$..list matches list at any depth in a list/list-item cycle', () => {
      expect(matchScope(parse('$..list'), ['list'])).toBe(true)
      expect(matchScope(parse('$..list'), ['list', 'list-item', 'list'])).toBe(
        true,
      )
      expect(
        matchScope(parse('$..list'), [
          'list',
          'list-item',
          'list',
          'list-item',
          'list',
        ]),
      ).toBe(true)
    })

    test('$..list-item matches list-item at any depth in a list/list-item cycle', () => {
      expect(matchScope(parse('$..list-item'), ['list', 'list-item'])).toBe(
        true,
      )
      expect(
        matchScope(parse('$..list-item'), [
          'list',
          'list-item',
          'list',
          'list-item',
        ]),
      ).toBe(true)
      expect(
        matchScope(parse('$..list-item'), [
          'list',
          'list-item',
          'list',
          'list-item',
          'list',
          'list-item',
        ]),
      ).toBe(true)
    })

    test('$..list.list-item matches at any depth', () => {
      expect(
        matchScope(parse('$..list.list-item'), ['list', 'list-item']),
      ).toBe(true)
      expect(
        matchScope(parse('$..list.list-item'), [
          'list',
          'list-item',
          'list',
          'list-item',
        ]),
      ).toBe(true)
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

  describe('type-name comparison is whole-string', () => {
    test('does not match on substring prefix', () => {
      expect(matchScope(parse('$.foo'), ['foobar'])).toBe(false)
      expect(matchScope(parse('$..foo'), ['foobar'])).toBe(false)
      expect(matchScope(parse('$..foo'), ['callout', 'foobar'])).toBe(false)
    })

    test('does not match on substring suffix', () => {
      expect(matchScope(parse('$.item'), ['list-item'])).toBe(false)
      expect(matchScope(parse('$..item'), ['list-item'])).toBe(false)
    })

    test('hyphenated type-names match exactly', () => {
      expect(matchScope(parse('$.list-item'), ['list-item'])).toBe(true)
      expect(matchScope(parse('$.list-item'), ['list'])).toBe(false)
    })
  })

  describe('repeated types in path', () => {
    test('$.a.a matches consecutive same-type chain', () => {
      expect(matchScope(parse('$.block.block'), ['block', 'block'])).toBe(true)
    })

    test('$..a matches when type repeats and is terminal', () => {
      expect(matchScope(parse('$..a'), ['a', 'a'])).toBe(true)
      expect(matchScope(parse('$..a'), ['a', 'a', 'a'])).toBe(true)
    })

    test('$..a does not match when terminal differs even if type appears earlier', () => {
      expect(matchScope(parse('$..a'), ['a', 'b'])).toBe(false)
      expect(matchScope(parse('$..a'), ['a', 'a', 'b'])).toBe(false)
    })

    test('$.a does not match when terminal is `a` but path is deeper than 1', () => {
      expect(matchScope(parse('$.a'), ['a', 'a'])).toBe(false)
    })
  })

  describe('backtracking with ambiguous matches', () => {
    test('$..foo.bar succeeds when terminal foo+bar pair is later in chain', () => {
      // First `foo` at idx 0 cannot align: typePath[1]=baz ≠ bar.
      // Backtrack to second `foo` at idx 2: typePath[3]=bar ✓, terminal.
      expect(
        matchScope(parse('$..foo.bar'), ['foo', 'baz', 'foo', 'bar']),
      ).toBe(true)
    })

    test('$..foo.bar fails when terminal is not bar even with extra foo', () => {
      expect(
        matchScope(parse('$..foo.bar'), ['foo', 'bar', 'foo', 'baz']),
      ).toBe(false)
    })

    test('$..a.b backtracks across multiple a-occurrences to align terminal b', () => {
      expect(matchScope(parse('$..a.b'), ['a', 'a', 'a', 'b'])).toBe(true)
    })

    test('$..a..b backtracks when intermediate any-descent has multiple match positions', () => {
      // `any a` could pick idx 0; then `any b` must align terminal.
      expect(matchScope(parse('$..a..b'), ['a', 'x', 'a', 'y', 'b'])).toBe(true)
    })
  })

  describe('repeated any-descent of the same type', () => {
    test('$..a..a requires two a-occurrences with terminal alignment', () => {
      expect(matchScope(parse('$..a..a'), ['a', 'a'])).toBe(true)
      expect(matchScope(parse('$..a..a'), ['a', 'b', 'a'])).toBe(true)
      expect(matchScope(parse('$..a..a'), ['a'])).toBe(false)
      expect(matchScope(parse('$..a..a'), ['a', 'b'])).toBe(false)
    })
  })

  describe('root-anchored chains', () => {
    test('$.a.b.c.d.e fails when path is one segment short', () => {
      expect(matchScope(parse('$.a.b.c.d.e'), ['a', 'b', 'c', 'd'])).toBe(false)
    })

    test('$.a.b.c.d.e fails when path is one segment longer', () => {
      expect(
        matchScope(parse('$.a.b.c.d.e'), ['a', 'b', 'c', 'd', 'e', 'f']),
      ).toBe(false)
    })

    test('$.a.b.c.d.e matches exact length and content', () => {
      expect(matchScope(parse('$.a.b.c.d.e'), ['a', 'b', 'c', 'd', 'e'])).toBe(
        true,
      )
    })

    test('$.a..b allows extra segments between root a and terminal b', () => {
      expect(matchScope(parse('$.a..b'), ['a', 'b'])).toBe(true)
      expect(matchScope(parse('$.a..b'), ['a', 'x', 'y', 'b'])).toBe(true)
      expect(matchScope(parse('$.a..b'), ['x', 'a', 'b'])).toBe(false)
    })
  })

  describe('terminal-alignment failures', () => {
    test('$..a fails when a is in the middle but never terminal', () => {
      expect(matchScope(parse('$..a'), ['x', 'a', 'y'])).toBe(false)
    })

    test('$..a.b fails when a appears but is never followed by terminal b', () => {
      expect(matchScope(parse('$..a.b'), ['a', 'c'])).toBe(false)
      expect(matchScope(parse('$..a.b'), ['a', 'c', 'a', 'd'])).toBe(false)
    })

    test('$..a..b fails when a appears but b is never terminal after a', () => {
      expect(matchScope(parse('$..a..b'), ['a', 'b', 'c'])).toBe(false)
    })
  })

  describe('mixed root and descendant in long chains', () => {
    test('$.callout..block fails when callout is not at root', () => {
      expect(
        matchScope(parse('$.callout..block'), [
          'table',
          'callout',
          'cell',
          'block',
        ]),
      ).toBe(false)
    })

    test('$.callout..block matches with intermediate any-depth', () => {
      expect(
        matchScope(parse('$.callout..block'), [
          'callout',
          'list',
          'list-item',
          'block',
        ]),
      ).toBe(true)
    })

    test('$.callout..block.span matches terminal exact pair after any descent', () => {
      expect(
        matchScope(parse('$.callout..block.span'), [
          'callout',
          'list',
          'list-item',
          'block',
          'span',
        ]),
      ).toBe(true)
    })

    test('$.callout..block.span fails when terminal pair adjacency is broken', () => {
      expect(
        matchScope(parse('$.callout..block.span'), [
          'callout',
          'block',
          'list',
          'span',
        ]),
      ).toBe(false)
    })
  })

  describe('case sensitivity', () => {
    test('type-name match is case-sensitive', () => {
      expect(matchScope(parse('$.Block'), ['block'])).toBe(false)
      expect(matchScope(parse('$.block'), ['Block'])).toBe(false)
    })
  })
})
