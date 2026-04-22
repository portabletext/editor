import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * Returns the names of list types available at the current focus.
 *
 * When the focus is inside a text block (including one nested in a
 * container), returns the lists declared by the applicable block
 * sub-schema. Falls back to the root schema's lists when there is no
 * focus text block (e.g. focus in a void block object).
 */
export const getAvailableLists: EditorSelector<Array<string>> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const lists = focusTextBlock
    ? getBlockSubSchema(snapshot.context, focusTextBlock.path).lists
    : snapshot.context.schema.lists
  return lists.map((list) => list.name)
}
