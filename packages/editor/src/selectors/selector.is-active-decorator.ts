import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
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

      // Spans whose block sub-schema does not declare the decorator are
      // out of scope: they neither vote nor disqualify. The decorator is
      // active iff every in-scope span carries it.
      const inScopeSpans = selectedSpans.filter((span) =>
        getBlockSubSchema(snapshot.context, span.path).decorators.some(
          (declared) => declared.name === decorator,
        ),
      )

      if (inScopeSpans.length === 0) {
        return false
      }

      return inScopeSpans.every((span) => span.node.marks?.includes(decorator))
    }

    const activeDecorators = getActiveDecorators(snapshot)

    return activeDecorators.includes(decorator)
  }
}
