import {isSpan} from '@portabletext/schema'
import type {PortableTextChild} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isEqualPaths} from '../utils/util.is-equal-paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartBlock} from './selector.get-selection-start-block'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

type SelectedChild<TChild extends PortableTextChild = PortableTextChild> = {
  node: TChild
  path: Path
}

type GetSelectedChildrenOptions<
  TChild extends PortableTextChild = PortableTextChild,
> = {
  filter?: (child: PortableTextChild) => child is TChild
}

/**
 * Returns the children (spans and inline objects) touched by the selection,
 * resolved at any depth.
 *
 * @public
 */
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

    const startChildSegment = startPoint.path.at(-1)
    const endChildSegment = endPoint.path.at(-1)
    const startChildKey = isKeyedSegment(startChildSegment)
      ? startChildSegment._key
      : undefined
    const endChildKey = isKeyedSegment(endChildSegment)
      ? endChildSegment._key
      : undefined

    const startBlock = getSelectionStartBlock(snapshot)
    const endBlock = getSelectionEndBlock(snapshot)
    const textBlocks = getSelectedTextBlocks(snapshot)
    const selectedChildren: Array<SelectedChild<TChild>> = []

    let startChildFound = false

    for (const block of textBlocks) {
      const isStartBlock = startBlock
        ? isEqualPaths(block.path, startBlock.path)
        : false
      const isEndBlock = endBlock
        ? isEqualPaths(block.path, endBlock.path)
        : false
      const isMiddleBlock = !isStartBlock && !isEndBlock

      for (const child of block.node.children) {
        const isStartChild = child._key === startChildKey
        const isEndChild = child._key === endChildKey

        const addChild = () => {
          if (!filter || filter(child)) {
            selectedChildren.push({
              node: child as TChild,
              path: [...block.path, 'children', {_key: child._key}],
            })
          }
        }

        if (isMiddleBlock) {
          addChild()
          continue
        }

        if (isStartBlock && isStartChild) {
          startChildFound = true
          if (isSpan(snapshot.context, child)) {
            if (startPoint.offset < child.text.length) {
              addChild()
            }
          } else {
            addChild()
          }

          if (isEndBlock && startChildKey === endChildKey) {
            break
          }
          continue
        }

        if (isEndBlock && isEndChild) {
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

      if (isStartBlock) {
        startChildFound = true
      }
    }

    return selectedChildren
  }
}
