import type {EditorInterface} from '../interfaces/editor'
import {Text} from '../interfaces/text'

export const hasTexts: EditorInterface['hasTexts'] = (_editor, element) => {
  return element.children?.every((n) => Text.isText(n)) ?? false
}
