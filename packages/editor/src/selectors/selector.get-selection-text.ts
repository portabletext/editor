import type {EditorSelector} from '../editor/editor-selector'
import {isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedSlice} from './selector.get-selected-slice'

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = (snapshot) => {
  const selectedSlice = getSelectedSlice(snapshot)

  return selectedSlice.reduce((text, block) => {
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
