import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getSibling} from '../node-traversal/get-sibling'
import {getBlock as getBlockEntry} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'
import {getBlock} from './get-block'

/**
 * Get the block immediately after the block at the given path.
 *
 * When `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if there is no next sibling block.
 */
export function getNextBlock(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextBlock; path: Path} | undefined {
  const block = getBlock(snapshot, options)

  if (!block) {
    return undefined
  }

  const context = {
    schema: snapshot.context.schema,
    editableTypes: snapshot.context.editableTypes,
    value: snapshot.context.value,
  }

  const sibling = getSibling(context, block.path, 'next')

  if (!sibling) {
    return undefined
  }

  return getBlockEntry(context, sibling.path)
}
