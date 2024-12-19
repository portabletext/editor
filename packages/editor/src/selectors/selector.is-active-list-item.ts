import type {EditorSelector} from '../editor/editor-selector'
import {getActiveListItem} from './selector.get-active-list-item'

/**
 * @public
 */
export function isActiveListItem(listItem: string): EditorSelector<boolean> {
  return (snapshot) => {
    const activeListItem = getActiveListItem(snapshot)

    return activeListItem === listItem
  }
}
