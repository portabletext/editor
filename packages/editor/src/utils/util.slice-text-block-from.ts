import type {
  PortableTextChild,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Return a shallow copy of `block` that contains the content from `from` to
 * the end of the block.
 *
 * Depth-agnostic counterpart to `sliceTextBlock`: takes a text block node
 * directly and resolves the starting child from `from.path.at(-1)` rather than
 * assuming the block is at the root. Used by container-aware split/delete
 * behaviors where the block lives inside an editable container (e.g. a code
 * block's line).
 */
export function sliceTextBlockFrom(args: {
  context: Pick<EditorContext, 'schema'>
  block: PortableTextTextBlock
  from: EditorSelectionPoint
}): PortableTextTextBlock {
  const {context, block, from} = args
  const startChildSegment = from.path.at(-1)
  const startChildKey = isKeyedSegment(startChildSegment)
    ? startChildSegment._key
    : undefined

  if (!startChildKey) {
    return block
  }

  let startChildFound = false
  const children: Array<PortableTextChild> = []

  for (const child of block.children) {
    if (child._key === startChildKey) {
      startChildFound = true
      if (isSpan(context, child)) {
        children.push({...child, text: child.text.slice(from.offset)})
      } else {
        children.push(child)
      }
      continue
    }
    if (startChildFound) {
      children.push(child)
    }
  }

  return {...block, children}
}
