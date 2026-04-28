import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * @public
 */
export const getActiveStyle: EditorSelector<PortableTextTextBlock['style']> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  // Blocks whose sub-schema doesn't declare any style (or declares it
  // empty) are out of scope: they can't carry a style and shouldn't vote.
  // The active style is the one shared by every in-scope block.
  const inScopeBlocks = getSelectedTextBlocks(snapshot).filter(
    (block) =>
      getBlockSubSchema(snapshot.context, block.path).styles.length > 0,
  )

  const firstStyle = inScopeBlocks.at(0)?.node.style

  if (!firstStyle) {
    return undefined
  }

  if (inScopeBlocks.every((block) => block.node.style === firstStyle)) {
    return firstStyle
  }

  return undefined
}
