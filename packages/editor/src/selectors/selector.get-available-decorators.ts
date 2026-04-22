import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * Returns the names of decorators available at the current focus.
 *
 * When the focus is inside a text block (including one nested in a
 * container), returns the decorators declared by the applicable block
 * sub-schema. Falls back to the root schema's decorators when there is
 * no focus text block (e.g. focus in a void block object).
 */
export const getAvailableDecorators: EditorSelector<Array<string>> = (
  snapshot,
) => {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const decorators = focusTextBlock
    ? getBlockSubSchema(snapshot.context, focusTextBlock.path).decorators
    : snapshot.context.schema.decorators
  return decorators.map((decorator) => decorator.name)
}
