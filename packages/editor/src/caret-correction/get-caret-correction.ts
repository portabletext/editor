import {getContainerFieldCorrection} from './rule.container-field'
import {getEmptyChildrenCorrection} from './rule.empty-children'
import {getInlineObjectBracketingCorrection} from './rule.inline-object-bracketing'
import type {CaretContext, CaretCorrection, CaretEntry} from './types'

/**
 * Returns one correction that gives the caret somewhere to go, or `undefined`.
 */
export function getCaretCorrection(
  entry: CaretEntry,
  context: CaretContext,
): CaretCorrection | undefined {
  return (
    getContainerFieldCorrection(entry, context) ??
    getEmptyChildrenCorrection(entry, context) ??
    getInlineObjectBracketingCorrection(entry, context)
  )
}
