import type {Element} from '../interfaces'
import type {Editor} from '../interfaces/editor'

export function isBlock(editor: Editor, value: Element): boolean {
  return !editor.isInline(value)
}
