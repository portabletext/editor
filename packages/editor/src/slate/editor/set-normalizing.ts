import type {Editor} from '../interfaces/editor'

export function setNormalizing(editor: Editor, isNormalizing: boolean): void {
  editor.normalizing = isNormalizing
}
