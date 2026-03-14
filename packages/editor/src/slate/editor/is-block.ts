import type {Editor} from '../interfaces/editor'
import type {Element} from '../interfaces/element'

export function isBlock(editor: Editor, value: Element): boolean {
  return !editor.isInline(value)
}
