import type {Element} from '../interfaces'
import {Editor} from '../interfaces/editor'
import {Text} from '../interfaces/text'

export function hasInlines(editor: Editor, element: Element): boolean {
  return element.children.some(
    (n) => Text.isText(n, editor.schema) || Editor.isInline(editor, n),
  )
}
