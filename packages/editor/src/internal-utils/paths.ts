import type {Path} from 'slate'
import type {EditorContext, EditorSelectionPoint, EditorSnapshot} from '..'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import {isSpan, isTextBlock} from './parse-blocks'

export function toSlatePath(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value'>
  } & Pick<EditorSnapshot, 'blockIndexMap'>,
  path: EditorSelectionPoint['path'],
): Path {
  const blockKey = getBlockKeyFromSelectionPoint({
    path,
    offset: 0,
  })

  if (!blockKey) {
    return []
  }

  const blockIndex = snapshot.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return []
  }

  const block = snapshot.context.value.at(blockIndex)

  if (!block) {
    return []
  }

  if (!isTextBlock(snapshot.context, block)) {
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
      if (isSpan(snapshot.context, child)) {
        childPath = [childIndex]
      } else {
        childPath = [childIndex, 0]
      }
      break
    }
  }

  return [blockIndex].concat(childPath)
}
