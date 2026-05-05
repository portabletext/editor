import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {isKeyedSegment} from './util.is-keyed-segment'
import {isSelectionCollapsed} from './util.is-selection-collapsed'

export function isAtTheBeginningOfBlock({
  snapshot,
  block,
}: {
  snapshot: EditorSnapshot
  block: PortableTextBlock
}) {
  if (!isTextBlock(snapshot.context, block)) {
    return false
  }

  if (!snapshot.context.selection) {
    return false
  }

  if (!isSelectionCollapsed(snapshot.context.selection)) {
    return false
  }

  // Resolve the focus's enclosing text block so we know we're inside `block`
  // and not in some unrelated structural position. Then read the child key
  // from the last keyed segment of the focus path; the field name (`children`,
  // or whatever the container declares) is irrelevant.
  const focusPath = snapshot.context.selection.focus.path
  const ancestorTextBlock = getAncestorTextBlock(snapshot, focusPath)

  if (!ancestorTextBlock || ancestorTextBlock.node._key !== block._key) {
    return false
  }

  const lastSegment = focusPath.at(-1)
  const focusChildKey = isKeyedSegment(lastSegment)
    ? lastSegment._key
    : undefined

  return (
    focusChildKey === block.children[0]?._key &&
    snapshot.context.selection.focus.offset === 0
  )
}
