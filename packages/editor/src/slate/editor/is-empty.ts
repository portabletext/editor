import type {EditorInterface} from '../interfaces/editor'

export const isEmpty: EditorInterface['isEmpty'] = (editor, element) => {
  const {children} = element
  const [first] = children
  return (
    children.length === 0 ||
    (children.length === 1 &&
      editor.isText(first) &&
      first.text === '' &&
      !editor.isVoid(element))
  )
}
