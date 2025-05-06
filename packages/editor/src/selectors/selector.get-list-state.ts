import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getFocusTextBlock, getPreviousBlock} from './selectors'

export type ListState = {
  index: number
}

export function getListState({
  path,
}: {
  path: [{_key: string}]
}): EditorSelector<ListState | undefined> {
  return (snapshot) => {
    const selection = {
      anchor: {
        path,
        offset: 0,
      },
      focus: {
        path,
        offset: 0,
      },
    }

    const focusTextBlock = getFocusTextBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })

    if (!focusTextBlock) {
      return undefined
    }

    if (
      focusTextBlock.node.listItem === undefined ||
      focusTextBlock.node.level === undefined
    ) {
      return undefined
    }

    const previousListItem = getPreviousListItem({
      listItem: focusTextBlock.node.listItem,
      level: focusTextBlock.node.level,
    })({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })

    if (!previousListItem) {
      return {
        index: 1,
      }
    }

    if (previousListItem.node.listItem !== focusTextBlock.node.listItem) {
      return {
        index: 1,
      }
    }

    if (
      previousListItem.node.level !== undefined &&
      previousListItem.node.level < focusTextBlock.node.level
    ) {
      return {
        index: 1,
      }
    }

    const previousListItemListState = getListState({
      path: previousListItem.path,
    })(snapshot)

    if (previousListItemListState === undefined) {
      return {
        index: 1,
      }
    }

    return {
      index: previousListItemListState.index + 1,
    }
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
            path: previousBlock.path,
            offset: 0,
          },
          focus: {
            path: previousBlock.path,
            offset: 0,
          },
        },
      },
    })
  }
}
