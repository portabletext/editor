import {isTextBlock} from '@portabletext/schema'
import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location, Span} from '../interfaces/location'
import {Span as SpanUtils} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {getNodes} from '../node/get-nodes'
import {comparePaths} from '../path/compare-paths'
import type {SelectionMode} from '../types/types'
import {path} from './path'

export function* nodes<T extends Node>(
  editor: Editor,
  options: {
    at?: Location | Span
    match?: NodeMatch<T>
    mode?: SelectionMode
    reverse?: boolean
    includeObjectNodes?: boolean
  } = {},
): Generator<NodeEntry<T>, void, undefined> {
  const {
    at = editor.selection,
    mode,
    reverse = false,
    includeObjectNodes = false,
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
    pass: ([node]) => {
      if (!isTextBlock({schema: editor.schema}, node)) {
        return false
      }
      if (!includeObjectNodes && editor.isElementReadOnly(node)) {
        return true
      }

      return false
    },
  })

  let hit: NodeEntry<T> | undefined

  for (const [node, path] of nodeEntries) {
    const isLower = hit && comparePaths(path, hit[1]) === 0

    // In highest mode any node lower than the last hit is not a match.
    if (mode === 'highest' && isLower) {
      continue
    }

    if (!match(node, path)) {
      continue
    }

    // When no mode is specified, yield every matching node.
    if (!mode) {
      yield [node as T, path] satisfies NodeEntry<T>
      hit = [node as T, path] satisfies NodeEntry<T>
      continue
    }

    // If there's a match and it's lower than the last, update the hit.
    if (mode === 'lowest' && isLower) {
      hit = [node as T, path] satisfies NodeEntry<T>
      continue
    }

    // In lowest mode we emit the last hit, once it's guaranteed lowest.
    const emit: NodeEntry<T> | undefined =
      mode === 'lowest' ? hit : ([node as T, path] satisfies NodeEntry<T>)

    if (emit) {
      yield emit
    }

    hit = [node as T, path] satisfies NodeEntry<T>
  }

  // Since lowest is always emitting one behind, catch up at the end.
  if (mode === 'lowest' && hit) {
    yield hit
  }
}
