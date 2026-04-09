import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import {isListBlock} from '../utils/parse-blocks'
import {getTextBlock} from './get-text-block'

/**
 * Get the list block at the given path.
 *
 * A list block is a text block with `listItem` and `level` properties. When
 * `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if the block at the path is not a list block or if no
 * text block is found.
 */
export function getListBlock(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextListBlock; path: Path} | undefined {
  const textBlock = getTextBlock(snapshot, options)

  if (!textBlock) {
    return undefined
  }

  if (!isListBlock(snapshot.context, textBlock.node)) {
    return undefined
  }

  return {node: textBlock.node, path: textBlock.path}
}
