import {isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function getBlockStartPoint({
  context,
  block,
}: {
  context: Pick<EditorContext, 'schema'>
  block: {
    node: PortableTextBlock
    path: Path
  }
}): EditorSelectionPoint {
  if (isTextBlock(context, block.node)) {
    const firstChild = block.node.children[0]
    return {
      path: [...block.path, 'children', {_key: firstChild?._key ?? ''}],
      offset: 0,
    }
  }

  return {
    path: block.path,
    offset: 0,
  }
}
