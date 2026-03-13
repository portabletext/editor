import {isElement} from '../element/is-element'
import type {Location, Span} from '../interfaces'
import type {Editor, NodeMatch} from '../interfaces/editor'
import {Span as SpanUtils} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNodes} from '../node/get-nodes'
import {comparePaths} from '../path/compare-paths'
import {isText} from '../text/is-text'
import type {SelectionMode} from '../types/types'
import {path} from './path'

export function* nodes<T extends Node>(
  editor: Editor,
  options: {
    at?: Location | Span
    match?: NodeMatch<T>
    mode?: SelectionMode
    universal?: boolean
    reverse?: boolean
    voids?: boolean
    pass?: (entry: NodeEntry) => boolean
  } = {},
): Generator<NodeEntry<T>, void, undefined> {
  const {
    at = editor.selection,
    mode = 'all',
    universal = false,
    reverse = false,
    voids = false,
    pass,
  } = options
  let {match} = options

  if (!match) {
    match = () => true
  }

  if (!at) {
    return
  }

  let from: Path
  let to: Path

  if (SpanUtils.isSpan(at)) {
    from = at[0]
    to = at[1]
  } else {
    const first = path(editor, at, {edge: 'start'})
    const last = path(editor, at, {edge: 'end'})
    from = reverse ? last : first
    to = reverse ? first : last
  }

  const nodeEntries = getNodes(editor, editor.schema, {
    reverse,
    from,
    to,
    pass: ([node, path]) => {
      if (pass && pass([node, path])) {
        return true
      }
      if (!isElement(node, editor.schema)) {
        return false
      }
      if (!voids && editor.isElementReadOnly(node)) {
        return true
      }

      return false
    },
  })

  const matches: NodeEntry<T>[] = []
  let hit: NodeEntry<T> | undefined

  for (const [node, path] of nodeEntries) {
    const isLower = hit && comparePaths(path, hit[1]) === 0

    // In highest mode any node lower than the last hit is not a match.
    if (mode === 'highest' && isLower) {
      continue
    }

    if (!match(node, path)) {
      // If we've arrived at a leaf text node that is not lower than the last
      // hit, then we've found a branch that doesn't include a match, which
      // means the match is not universal.
      if (universal && !isLower && isText(node, editor.schema)) {
        return
      } else {
        continue
      }
    }

    // If there's a match and it's lower than the last, update the hit.
    if (mode === 'lowest' && isLower) {
      hit = [node, path] as NodeEntry<T>
      continue
    }

    // In lowest mode we emit the last hit, once it's guaranteed lowest.
    const emit: NodeEntry<T> | undefined =
      mode === 'lowest' ? hit : ([node, path] as NodeEntry<T>)

    if (emit) {
      if (universal) {
        matches.push(emit)
      } else {
        yield emit
      }
    }

    hit = [node, path] as NodeEntry<T>
  }

  // Since lowest is always emitting one behind, catch up at the end.
  if (mode === 'lowest' && hit) {
    if (universal) {
      matches.push(hit)
    } else {
      yield hit
    }
  }

  // Universal defers to ensure that the match occurs in every branch, so we
  // yield all of the matches after iterating.
  if (universal) {
    yield* matches
  }
}
