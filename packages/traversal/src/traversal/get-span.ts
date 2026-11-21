import {isTextBlock} from '@portabletext/schema'
import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {everyPath} from './every-field'
import {getNode} from './get-node'
import {isInline} from './is-inline'
import {textView, restoreTextEntry} from './text-view'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Get the span at a given path. Returns `undefined` for a span outside a text block's `children`.
 *
 * @public
 */
export function getSpan(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: PortableTextSpan; path: Path} | undefined {
  if (snapshot.context.containers === undefined) {
    const resolved = everyPath(snapshot, path)
    const entry = resolved.found ? resolved.nodes.at(-1) : undefined
    const parent = resolved.nodes.at(-2)
    if (
      !entry ||
      !parent ||
      !isTextBlock(snapshot.context, parent.node) ||
      entry.path.length !== parent.path.length + 2 ||
      entry.path[parent.path.length] !== 'children'
    ) {
      return undefined
    }
    const view = textView(snapshot, path)
    return view
      ? restoreTextEntry(view, getSpan(view.snapshot, view.path))
      : undefined
  }
  const entry = getNode(snapshot, path)

  if (!entry) {
    return undefined
  }

  if (
    !isInline(snapshot, entry.path) ||
    !isSpan({schema: snapshot.context.schema}, entry.node)
  ) {
    return undefined
  }

  return {node: entry.node, path: entry.path}
}
