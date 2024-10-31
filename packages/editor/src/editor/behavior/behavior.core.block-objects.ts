import {isPortableTextTextBlock} from '@sanity/types'
import {defineBehavior} from './behavior.types'
import {
  getFocusBlockObject,
  getFocusTextBlock,
  getNextBlock,
  getPreviousBlock,
  isEmptyTextBlock,
  selectionIsCollapsed,
} from './behavior.utils'

const breakingVoidBlock = defineBehavior({
  on: 'insert break',
  guard: ({context}) => {
    const focusBlockObject = getFocusBlockObject(context)

    return !!focusBlockObject
  },
  actions: [() => [{type: 'insert text block', decorators: []}]],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete backward',
  guard: ({context}) => {
    const focusTextBlock = getFocusTextBlock(context)
    const selectionCollapsed = selectionIsCollapsed(context)
    const previousBlock = getPreviousBlock(context)

    if (!focusTextBlock || !selectionCollapsed || !previousBlock) {
      return false
    }

    if (
      isEmptyTextBlock(focusTextBlock.node) &&
      !isPortableTextTextBlock(previousBlock.node)
    ) {
      return {focusTextBlock, previousBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock, previousBlock}) => [
      {
        type: 'delete',
        selection: {
          anchor: {path: focusTextBlock.path, offset: 0},
          focus: {path: focusTextBlock.path, offset: 0},
        },
      },
      {
        type: 'select',
        selection: {
          anchor: {path: previousBlock.path, offset: 0},
          focus: {path: previousBlock.path, offset: 0},
        },
      },
    ],
  ],
})

const deletingEmptyTextBlockBeforeBlockObject = defineBehavior({
  on: 'delete forward',
  guard: ({context}) => {
    const focusTextBlock = getFocusTextBlock(context)
    const selectionCollapsed = selectionIsCollapsed(context)
    const nextBlock = getNextBlock(context)

    if (!focusTextBlock || !selectionCollapsed || !nextBlock) {
      return false
    }

    if (
      isEmptyTextBlock(focusTextBlock.node) &&
      !isPortableTextTextBlock(nextBlock.node)
    ) {
      return {focusTextBlock, nextBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock, nextBlock}) => [
      {
        type: 'delete',
        selection: {
          anchor: {path: focusTextBlock.path, offset: 0},
          focus: {path: focusTextBlock.path, offset: 0},
        },
      },
      {
        type: 'select',
        selection: {
          anchor: {path: nextBlock.path, offset: 0},
          focus: {path: nextBlock.path, offset: 0},
        },
      },
    ],
  ],
})

export const coreBlockObjectBehaviors = [
  breakingVoidBlock,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
]
