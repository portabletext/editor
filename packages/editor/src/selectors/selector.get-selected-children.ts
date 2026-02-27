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

    const startBlockIndex = snapshot.blockPathMap.getIndex(startBlockKey)
    const endBlockIndex = snapshot.blockPathMap.getIndex(endBlockKey)

    if (startBlockIndex === undefined || endBlockIndex === undefined) {
      return []
    }

    const selectedChildren: Array<SelectedChild<TChild>> = []
    const minBlockIndex = Math.min(startBlockIndex, endBlockIndex)
    const maxBlockIndex = Math.max(startBlockIndex, endBlockIndex)
    const blocks = snapshot.context.value.slice(
      minBlockIndex,
      maxBlockIndex + 1,
    )

    let startChildFound = false

    for (const block of blocks) {
      if (!isTextBlock(snapshot.context, block)) {
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
    }

    return selectedChildren
  }
}
