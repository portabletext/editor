import type {EditorInterface} from '../interfaces/editor'

export const insertBreak: EditorInterface['insertBreak'] = (editor) => {
  editor.splitNodes({always: true})
}
