import type {Path} from 'slate'
import type {
  EditorContext,
  EditorSelectionPoint,
  EditorSnapshot,
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '..'
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
): {
  block: PortableTextBlock | undefined
  child: PortableTextSpan | PortableTextObject | undefined
  path: Path
} {
  const blockKey = getBlockKeyFromSelectionPoint({
    path,
    offset: 0,
  })

  if (!blockKey) {
    return {
      block: undefined,
      child: undefined,
      path: [],
    }
  }

  const blockIndex = snapshot.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return {
      block: undefined,
      child: undefined,
      path: [],
    }
  }

  const block = snapshot.context.value.at(blockIndex)

  if (!block) {
    return {
      block: undefined,
      child: undefined,
      path: [],
    }
  }

  if (!isTextBlock(snapshot.context, block)) {
    return {
      block,
      child: undefined,
      path: [blockIndex, 0],
    }
  }

  const childKey = getChildKeyFromSelectionPoint({
    path,
    offset: 0,
  })

  if (!childKey) {
    return {
      block,
      child: undefined,
      path: [blockIndex, 0],
    }
  }

  let childPath: Array<number> = []
  let childIndex = -1
  let pathChild: PortableTextSpan | PortableTextObject | undefined = undefined

  for (const child of block.children) {
    childIndex++
    if (child._key === childKey) {
      pathChild = child
      if (isSpan(snapshot.context, child)) {
        childPath = [childIndex]
      } else {
        childPath = [childIndex, 0]
      }
      break
    }
  }

  if (childPath.length === 0) {
    return {
      block,
      child: undefined,
      path: [blockIndex, 0],
    }
  }

  return {
    block,
    child: pathChild,
    path: [blockIndex].concat(childPath),
  }
}
