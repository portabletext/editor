import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * Returns the names of styles available at the current focus.
 *
 * When the focus is inside a text block (including one nested in a
 * container), returns the styles declared by the applicable block
 * sub-schema. Falls back to the root schema's styles when there is no
 * focus text block (e.g. focus in a void block object).
 *
 * @beta
 */
export const getAvailableStyles: EditorSelector<Array<string>> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const styles = focusTextBlock
    ? getBlockSubSchema(snapshot.context, focusTextBlock.path).styles
    : snapshot.context.schema.styles
  return styles.map((style) => style.name)
}
