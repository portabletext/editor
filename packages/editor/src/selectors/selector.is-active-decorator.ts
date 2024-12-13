import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedSpans} from './selector.get-selected-spans'

/**
 * @alpha
 */
export function isActiveDecorator(decorator: string): EditorSelector<boolean> {
  return (snapshot) => {
    const selectedSpans = getSelectedSpans(snapshot)

    return (
      selectedSpans.length > 0 &&
      selectedSpans.every((span) => span.node.marks?.includes(decorator))
    )
  }
}
