import type {Editor} from '../interfaces/editor'

export function isNormalizing(editor: Editor): boolean {
  return editor.normalizing
}
