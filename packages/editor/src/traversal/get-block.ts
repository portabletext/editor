import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getBlock as getBlockEntry} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Get the nearest block at or above the given path.
 *
 * A block is a node whose parent is not a text block. This function walks up
 * from the given path, checking the node at each ancestor level, and returns
 * the first one that is a block.
 *
 * When `at` is omitted, defaults to the focus path of the current selection.
 * Returns undefined if no block is found, or if there is no selection and no
 * `at` path provided.
 */
export function getBlock(
  snapshot: EditorSnapshot,
  options?: {at?: Path},
): {node: PortableTextBlock; path: Path} | undefined {
  const path = options?.at ?? snapshot.context.selection?.focus.path

  if (!path) {
    return undefined
  }

  const context = {
    schema: snapshot.context.schema,
    editableTypes: snapshot.context.editableTypes,
    value: snapshot.context.value,
  }

  // Try the node at the path itself first
  const entry = getBlockEntry(context, path)

  if (entry) {
    return entry
  }

  // Walk up through ancestor paths (nearest first)
  // Each keyed segment boundary represents a node level
  const keyedIndices: Array<number> = []

  for (let index = 0; index < path.length; index++) {
    if (isKeyedSegment(path[index])) {
      keyedIndices.push(index)
    }
  }

  for (let index = keyedIndices.length - 2; index >= 0; index--) {
    const endIndex = keyedIndices[index]

    if (endIndex === undefined) {
      continue
    }

    const ancestorPath = path.slice(0, endIndex + 1)
    const ancestorEntry = getBlockEntry(context, ancestorPath)

    if (ancestorEntry) {
      return ancestorEntry
    }
  }

  return undefined
}
