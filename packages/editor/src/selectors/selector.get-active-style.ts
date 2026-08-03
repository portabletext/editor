import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
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

  const selectedTextBlocks = getSelectedTextBlocks(snapshot)
  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  // A block without a `style` reads as its sub-schema's default (the
  // first declared style), the same value normalization fills in when a
  // local edit touches the block.
  const firstStyle =
    firstTextBlock.node.style ??
    getPathSubSchema(snapshot, firstTextBlock.path).styles.at(0)?.name

  if (!firstStyle) {
    return undefined
  }

  // Skip blocks whose sub-schema does not declare the style. A style is
  // active when every in-scope block carries it.
  const inScopeBlocks = selectedTextBlocks.filter((block) =>
    getPathSubSchema(snapshot, block.path).styles.some(
      (s) => s.name === firstStyle,
    ),
  )

  if (
    inScopeBlocks.every(
      (block) =>
        (block.node.style ??
          getPathSubSchema(snapshot, block.path).styles.at(0)?.name) ===
        firstStyle,
    )
  ) {
    return firstStyle
  }

  return undefined
}
