import {getContainerFieldCorrection} from './rule.container-field'
import {getEmptyChildrenCorrection} from './rule.empty-children'
import {getInlineObjectBracketingCorrection} from './rule.inline-object-bracketing'
import type {CaretContext, CaretCorrection, CaretEntry} from './types'

/**
 * Returns one correction that gives the caret somewhere to go, or `undefined`.
 */
export function getCaretCorrection(
  context: CaretContext,
  entry: CaretEntry,
): CaretCorrection | undefined {
  return (
    getContainerFieldCorrection(context, entry) ??
    getEmptyChildrenCorrection(context, entry) ??
    getInlineObjectBracketingCorrection(context, entry)
  )
}
