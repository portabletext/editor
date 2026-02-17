import {isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextChild} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../utils/util.selection-point'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

type SelectedChild<TChild extends PortableTextChild = PortableTextChild> = {
  node: TChild
  path: ChildPath
}

type GetSelectedChildrenOptions<
  TChild extends PortableTextChild = PortableTextChild,
> = {
  filter?: (child: PortableTextChild) => child is TChild
}

export function getSelectedChildren<
  TChild extends PortableTextChild = PortableTextChild,
>(
  options?: GetSelectedChildrenOptions<TChild>,
): EditorSelector<Array<SelectedChild<TChild>>> {
  const filter = options?.filter

  return (snapshot) => {
    const startPoint = getSelectionStartPoint(snapshot)
    const endPoint = getSelectionEndPoint(snapshot)

    if (!startPoint || !endPoint) {
      return []
    }

    const startBlockKey = getBlockKeyFromSelectionPoint(startPoint)
    const endBlockKey = getBlockKeyFromSelectionPoint(endPoint)
    const startChildKey = getChildKeyFromSelectionPoint(startPoint)
    const endChildKey = getChildKeyFromSelectionPoint(endPoint)

    if (!startBlockKey || !endBlockKey) {
      return []
    }

    const startEntry = snapshot.blockMap.get(startBlockKey)
    const endEntry = snapshot.blockMap.get(endBlockKey)

    if (!startEntry || !endEntry) {
      return []
    }

    const selectedChildren: Array<SelectedChild<TChild>> = []

    // Collect blocks from start to end by walking the linked list
    // We need to handle forward and backward selections
    const startIndex = startEntry.index
    const endIndex = endEntry.index
    const minKey = startIndex <= endIndex ? startBlockKey : endBlockKey
    const maxKey = startIndex <= endIndex ? endBlockKey : startBlockKey

    let currentKey: string | null = minKey
    let startChildFound = false

    while (currentKey !== null) {
      const entry = snapshot.blockMap.get(currentKey)

      if (!entry) {
        break
      }

      const block = snapshot.context.value[entry.index]

      if (!block) {
        break
      }

      if (!isTextBlock(snapshot.context, block)) {
        if (currentKey === maxKey) {
          break
        }
        currentKey = entry.next
        continue
      }

      const isStartBlock = block._key === startBlockKey
      const isEndBlock = block._key === endBlockKey
      const isMiddleBlock = !isStartBlock && !isEndBlock

      for (const child of block.children) {
        const isStartChild = child._key === startChildKey
        const isEndChild = child._key === endChildKey

        const addChild = () => {
          if (!filter || filter(child)) {
            selectedChildren.push({
              node: child as TChild,
              path: [{_key: block._key}, 'children', {_key: child._key}],
            })
          }
        }

        if (isMiddleBlock) {
          addChild()
          continue
        }

        if (isStartChild) {
          startChildFound = true
          if (isSpan(snapshot.context, child)) {
            if (startPoint.offset < child.text.length) {
              addChild()
            }
          } else {
            addChild()
          }

          if (startChildKey === endChildKey) {
            break
          }
          continue
        }

        if (isEndChild) {
          if (isSpan(snapshot.context, child)) {
            if (endPoint.offset > 0) {
              addChild()
            }
          } else {
            addChild()
          }
          break
        }

        if (startChildFound) {
          addChild()
        }
      }

      if (isStartBlock && startBlockKey === endBlockKey) {
        break
      }

      if (isStartBlock) {
        startChildFound = true
      }

      if (currentKey === maxKey) {
        break
      }

      currentKey = entry.next
    }

    return selectedChildren
  }
}
