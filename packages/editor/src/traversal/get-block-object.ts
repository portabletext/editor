import type {PortableTextObject} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {getBlock} from './get-block'

/**
 * Get the block object at the given path.
 *
 * A block object is a block that is not a text block. When `at` is omitted,
 * defaults to the focus path of the current selection. Returns undefined if
 * the block at the path is a text block or if no block is found.
 */
export function getBlockObject(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextObject; path: Path} | undefined {
  const block = getBlock(snapshot, options)

  if (!block) {
    return undefined
  }

  if (isTextBlock(snapshot.context, block.node)) {
    return undefined
  }

  return {node: block.node, path: block.path}
}
