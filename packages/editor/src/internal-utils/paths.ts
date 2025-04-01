import {isKeySegment, type Path} from '@sanity/types'
import {isEqual} from 'lodash'
import {Editor, Element, type Descendant, type Path as SlatePath} from 'slate'

export function toSlatePath(path: Path, editor: Editor): SlatePath {
  if (!editor) {
    return []
  }
  const [block, blockPath] = Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n) =>
        isKeySegment(path[0]) && (n as Descendant)._key === path[0]._key,
    }),
  )[0] || [undefined, undefined]

  if (!block || !Element.isElement(block)) {
    return []
  }

  if (editor.isVoid(block)) {
    return [blockPath[0], 0]
  }

  const childPath = [path[2]]
  const childIndex = block.children.findIndex((child) =>
    isEqual([{_key: child._key}], childPath),
  )

  if (childIndex >= 0 && block.children[childIndex]) {
    const child = block.children[childIndex]
    if (Element.isElement(child) && editor.isVoid(child)) {
      return blockPath.concat(childIndex).concat(0)
    }
    return blockPath.concat(childIndex)
  }

  return [blockPath[0], 0]
}
