import type {EditorInterface} from '../interfaces/editor'

export const setNormalizing: EditorInterface['setNormalizing'] = (
  editor,
  isNormalizing,
) => {
  editor.normalizing = isNormalizing
}
