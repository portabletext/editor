import type {EditorSelector} from '../editor/editor-selector'
import {getActiveStyle} from './selector.get-active-style'

/**
 * @alpha
 */
export function isActiveStyle(style: string): EditorSelector<boolean> {
  return (snapshot) => {
    const activeStyle = getActiveStyle(snapshot)

    return activeStyle === style
  }
}
