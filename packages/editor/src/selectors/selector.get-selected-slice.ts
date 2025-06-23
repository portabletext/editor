import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * @public
 * @deprecated Renamed to `getSelectedValue`.
 */
export const getSelectedSlice: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  return getSelectedValue(snapshot)
}
