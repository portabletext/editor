import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockByPath} from '../internal-utils/block-path-utils'
import type {BlockPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectionPath = snapshot.context.selection.anchor.path

  // Traverse the path backwards to find the deepest block
  // For nested paths like [{table}, 'children', {row}, 'children', {cell}, 'children', {span}]
  // We check each keyed segment starting from the end, looking for one that exists in blockIndexMap
  for (let i = selectionPath.length - 1; i >= 0; i--) {
    const segment = selectionPath[i]

    if (isKeyedSegment(segment)) {
      const blockPath = snapshot.blockIndexMap.get(segment._key)

      if (blockPath !== undefined) {
        const node = getBlockByPath(snapshot.context, blockPath)

        if (node) {
          // Return the path up to and including this block segment
          const path = selectionPath.slice(0, i + 1) as BlockPath
          return {node, path}
        }
      }
    }
  }

  return undefined
}
