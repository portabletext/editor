import type {EditorSelector} from '../editor/editor-selector'
import {getAvailableLists} from './selector.get-available-lists'

/**
 * Returns `true` when the named list type is available at the current
 * focus. Composes [[`getAvailableLists`]].
 *
 * @beta
 */
export function isAvailableList(list: string): EditorSelector<boolean> {
  return (snapshot) => getAvailableLists(snapshot).includes(list)
}
