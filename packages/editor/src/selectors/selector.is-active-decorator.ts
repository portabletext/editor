import type {EditorSelector} from '../editor/editor-selector'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
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

      // Skip spans whose enclosing block sub-schema does not declare the
      // decorator. A mark is active when every in-scope span carries it.
      const inScopeSpans = selectedSpans.filter((span) =>
        getPathSubSchema(snapshot, span.path).decorators.some(
          (d) => d.name === decorator,
        ),
      )

      return (
        inScopeSpans.length > 0 &&
        inScopeSpans.every((span) => span.node.marks?.includes(decorator))
      )
    }

    const activeDecorators = getActiveDecorators(snapshot)

    return activeDecorators.includes(decorator)
  }
}
