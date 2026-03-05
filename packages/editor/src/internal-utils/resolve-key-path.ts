import type {Ancestor} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Resolve a block key to its Slate index path.
 *
 * Uses the editor's blockIndexMap for O(1) lookup. When containers are
 * introduced, this function will walk the tree to find nested blocks.
 */
export function resolveBlockIndex(
  editor: PortableTextSlateEditor,
  blockKey: string,
): number | undefined {
  return editor.blockIndexMap.get(blockKey)
}

/**
 * Resolve a block key + child key to a Slate index path [blockIndex, childIndex].
 *
 * Finds the block via blockIndexMap, then searches its children for the
 * matching child key.
 */
export function resolveChildPath(
  editor: PortableTextSlateEditor,
  blockKey: string,
  childKey: string,
): [number, number] | undefined {
  const blockIndex = editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return undefined
  }

  const block = editor.children[blockIndex] as Ancestor | undefined

  if (!block || !('children' in block) || !Array.isArray(block.children)) {
    return undefined
  }

  const childIndex = block.children.findIndex(
    (child: any) => child._key === childKey,
  )

  if (childIndex === -1) {
    return undefined
  }

  return [blockIndex, childIndex]
}

/**
 * Resolve a block key to the block node itself.
 *
 * Convenience function that combines index lookup with node access.
 */
export function resolveBlock(
  editor: PortableTextSlateEditor,
  blockKey: string,
): {node: Ancestor; index: number} | undefined {
  const blockIndex = editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return undefined
  }

  const node = editor.children[blockIndex] as Ancestor | undefined

  if (!node) {
    return undefined
  }

  return {node, index: blockIndex}
}
