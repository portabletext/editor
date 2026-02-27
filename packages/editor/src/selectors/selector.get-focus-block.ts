import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

/**
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = getBlockKeyFromSelectionPoint(snapshot.context.selection.focus)
  const index = key ? snapshot.blockPathMap.getIndex(key) : undefined

  const node =
    index !== undefined ? snapshot.context.value.at(index) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
