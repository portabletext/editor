import type {Element} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {isText} from '../text/is-text'

export function hasInlines(editor: Editor, element: Element): boolean {
  return element.children.some(
    (n) => isText(n, editor.schema) || editor.isInline(n),
  )
}
