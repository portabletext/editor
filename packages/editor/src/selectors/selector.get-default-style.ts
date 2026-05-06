import type {EditorSelector} from '../editor/editor-selector'
import {getPathSubSchema} from '../schema/get-path-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * Returns the default style name for a new block at the current focus.
 *
 * This is the first entry of the focus text block's sub-schema styles, or
 * the first entry of the root styles when there is no focus text block
 * (e.g. focus in a void block object). Used by `insert.break` when
 * creating a sibling block.
 *
 * Returns `undefined` when the applicable sub-schema declares no styles.
 */
export const getDefaultStyle: EditorSelector<string | undefined> = (
  snapshot,
) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  if (focusTextBlock) {
    return getPathSubSchema(snapshot, focusTextBlock.path).styles[0]?.name
  }
  return snapshot.context.schema.styles[0]?.name
}
