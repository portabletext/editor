import type {EditorInterface} from '../interfaces/editor'

export const hasTexts: EditorInterface['hasTexts'] = (editor, element) => {
  return (element.children ?? []).every((n) => editor.isText(n))
}
