import {Element, type Editor, type Path} from 'slate'
import type {EditorSelectionPoint} from '..'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'

export function toSlatePath(
  path: EditorSelectionPoint['path'],
  editor: Editor,
): Path {
  const blockKey = getBlockKeyFromSelectionPoint({
    path,
    offset: 0,
  })

  if (!blockKey) {
    return []
  }

  const blockIndex = editor.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return []
  }

  const block = editor.children.at(blockIndex)

  if (!block || !Element.isElement(block)) {
    return []
  }

  if (editor.isVoid(block)) {
    return [blockIndex, 0]
  }

  const childKey = getChildKeyFromSelectionPoint({
    path,
    offset: 0,
  })

  if (!childKey) {
    return [blockIndex, 0]
  }

  let childPath: Array<number> = []
  let childIndex = -1

  for (const child of block.children) {
    childIndex++
    if (child._key === childKey) {
      if (Element.isElement(child) && editor.isVoid(child)) {
        childPath = [childIndex, 0]
      } else {
        childPath = [childIndex]
      }
      break
    }
  }

  return [blockIndex].concat(childPath)
}
