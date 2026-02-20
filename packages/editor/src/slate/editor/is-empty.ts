import type {EditorInterface} from '../interfaces/editor'

export const isEmpty: EditorInterface['isEmpty'] = (editor, element) => {
  // Void elements are never "empty" — they have content, just not text children
  if (editor.isVoid(element)) {
    return false
  }

  const children = element.children ?? []
  const [first] = children
  return (
    children.length === 0 ||
    (children.length === 1 && editor.isText(first) && first.text === '')
  )
}
