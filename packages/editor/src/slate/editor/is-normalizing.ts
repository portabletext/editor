import type {EditorInterface} from '../interfaces/editor'

export const isNormalizing: EditorInterface['isNormalizing'] = (editor) => {
  return editor.normalizing
}
