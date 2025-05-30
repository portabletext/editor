import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getKeyedBlockPath, type BlockPath} from '../types/paths'
import {getPreviousBlock} from './selectors'

/**
 * @beta
 * Given the `path` of a block, this selector will return the "list index" of
 * the block.
 */
export function getListIndex({
  path,
}: {
  path: BlockPath
}): EditorSelector<number | undefined> {
  return (snapshot) => {
    const keyedPath = getKeyedBlockPath(snapshot.context.value, path)

    if (!keyedPath) {
      return undefined
    }

    const blockIndex = snapshot.context.value.findIndex(
      (block) => block._key === keyedPath[0]._key,
    )

    const block = snapshot.context.value[blockIndex]

    if (blockIndex === -1 || !isTextBlock(snapshot.context, block)) {
      return undefined
    }

    if (block.listItem === undefined || block.level === undefined) {
      return undefined
    }

    const previousListItem = getPreviousListItem({
      listItem: block.listItem,
      level: block.level,
    })({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: {
            path: [blockIndex],
            offset: 0,
          },
          focus: {
            path: [blockIndex],
            offset: 0,
          },
        },
      },
    })

    if (!previousListItem) {
      return 1
    }

    if (previousListItem.node.listItem !== block.listItem) {
      return 1
    }

    if (
      previousListItem.node.level !== undefined &&
      previousListItem.node.level < block.level
    ) {
      return 1
    }

    const previousListItemListState = getListIndex({
      path: previousListItem.path,
    })(snapshot)

    if (previousListItemListState === undefined) {
      return 1
    }

    return previousListItemListState + 1
  }
}

function getPreviousListItem({
  listItem,
  level,
}: {
  listItem: string
  level: number
}): EditorSelector<
  | {
      node: PortableTextTextBlock
      path: [{_key: string}]
    }
  | undefined
> {
  return (snapshot) => {
    const previousBlock = getPreviousBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
      },
    })

    if (!previousBlock) {
      return undefined
    }

    if (!isTextBlock(snapshot.context, previousBlock.node)) {
      return undefined
    }

    if (
      previousBlock.node.listItem === undefined ||
      previousBlock.node.level === undefined
    ) {
      return undefined
    }

    if (previousBlock.node.listItem !== listItem) {
      return undefined
    }

    if (previousBlock.node.level === level) {
      return {
        node: previousBlock.node,
        path: previousBlock.path,
      }
    }

    if (previousBlock.node.level < level) {
      return undefined
    }

    return getPreviousListItem({
      listItem,
      level,
    })({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: {
          anchor: {
            path: [previousBlock.index],
            offset: 0,
          },
          focus: {
            path: [previousBlock.index],
            offset: 0,
          },
        },
      },
    })
  }
}
