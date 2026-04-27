import type {EditorSelector} from '../editor/editor-selector'
import {getAvailableDecorators} from './selector.get-available-decorators'

/**
 * Returns `true` when the named decorator is available at the current
 * focus. Composes [[`getAvailableDecorators`]].
 *
 * @beta
 */
export function isAvailableDecorator(
  decorator: string,
): EditorSelector<boolean> {
  return (snapshot) => getAvailableDecorators(snapshot).includes(decorator)
}
