import type {EditorSelector} from '../editor/editor-selector'
import {getActiveDecorators} from './selector.get-active-decorators'
import {getSelectedSpans} from './selector.get-selected-spans'
import {isSelectionExpanded} from './selector.is-selection-expanded'

/**
 * @public
 */
export function isActiveDecorator(decorator: string): EditorSelector<boolean> {
  return (snapshot) => {
    if (isSelectionExpanded(snapshot)) {
      const selectedSpans = getSelectedSpans(snapshot)

      return (
        selectedSpans.length > 0 &&
        selectedSpans.every((span) => span.node.marks?.includes(decorator))
      )
    }

    const activeDecorators = getActiveDecorators(snapshot)

    return activeDecorators.includes(decorator)
  }
}
