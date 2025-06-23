import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = (snapshot) => {
  const selectedValue = getSelectedValue(snapshot)

  return selectedValue.reduce((text, block) => {
    if (!isTextBlock(snapshot.context, block)) {
      return text
    }

    return (
      text +
      block.children.reduce((text, child) => {
        if (isSpan(snapshot.context, child)) {
          return text + child.text
        }

        return text
      }, '')
    )
  }, '')
}
