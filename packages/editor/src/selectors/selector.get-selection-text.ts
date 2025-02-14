import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedSlice} from './selector.get-selected-slice'

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = ({context}) => {
  const selectedSlice = getSelectedSlice({context})

  return selectedSlice.reduce((text, block) => {
    if (!isPortableTextTextBlock(block)) {
      return text
    }

    return (
      text +
      block.children.reduce((text, child) => {
        if (isPortableTextSpan(child)) {
          return text + child.text
        }

        return text
      }, '')
    )
  }, '')
}
