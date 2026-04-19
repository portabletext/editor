/**
 * Parses a scope string into a structured form.
 *
 * A scope is a JSONPath-inspired expression that identifies positions in the
 * schema tree. The grammar is documented in `/specs/scope-grammar.md` on the
 * board; see `ContainerScope` and `LeafScope` in `./scope.types.ts` for the
 * type-level enumeration.
 *
 * Parsing is purely syntactic: it validates shape, not schema. Schema-aware
 * checks (unknown types, the `block.` rule for spans and inline objects)
 * happen later at registration time.
 *
 * @internal
 */

const typeSegmentPattern = /^[a-zA-Z][a-zA-Z0-9\-_]*$/

export type ScopeAnchor = '$.' | '$..'

export type ScopeDescent = 'exact' | 'any'

export type ScopeSegment = {
  type: string
  descent: ScopeDescent
}

export type ParsedScope = {
  anchor: ScopeAnchor
  segments: Array<ScopeSegment>
}

export function parseScope(scope: string): ParsedScope | null {
  if (scope.length === 0) {
    return null
  }

  let anchor: ScopeAnchor
  let remainder: string

  if (scope.startsWith('$..')) {
    anchor = '$..'
    remainder = scope.slice(3)
  } else if (scope.startsWith('$.')) {
    anchor = '$.'
    remainder = scope.slice(2)
  } else {
    return null
  }

  if (remainder.length === 0) {
    return null
  }

  const segments: Array<ScopeSegment> = []
  let cursor = 0
  let pendingDescent: ScopeDescent = anchor === '$..' ? 'any' : 'exact'

  while (cursor < remainder.length) {
    const nextDot = remainder.indexOf('.', cursor)
    const typeEnd = nextDot === -1 ? remainder.length : nextDot
    const type = remainder.slice(cursor, typeEnd)

    if (!typeSegmentPattern.test(type)) {
      return null
    }

    segments.push({type, descent: pendingDescent})

    if (nextDot === -1) {
      return {anchor, segments}
    }

    if (remainder[nextDot + 1] === '.') {
      pendingDescent = 'any'
      cursor = nextDot + 2
    } else {
      pendingDescent = 'exact'
      cursor = nextDot + 1
    }

    if (cursor >= remainder.length) {
      return null
    }
  }

  /* c8 ignore next */
  return null
}
