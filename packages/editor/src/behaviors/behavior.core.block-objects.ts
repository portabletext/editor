import {isPortableTextTextBlock} from '@sanity/types'
import {isEmptyTextBlock} from '../editor/utils/utils'
import {
  getFocusBlockObject,
  getFocusTextBlock,
  getNextBlock,
  getPreviousBlock,
  selectionIsCollapsed,
} from '../selectors/selectors'
import {isHotkey} from '../utils/is-hotkey'
import {defineBehavior} from './behavior.types'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isArrowDown = isHotkey('ArrowDown', event.keyboardEvent)
    const focusBlockObject = getFocusBlockObject({context})
    const nextBlock = getNextBlock({context})

    return isArrowDown && focusBlockObject && !nextBlock
  },
  actions: [() => [{type: 'insert.text block', placement: 'after'}]],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isArrowUp = isHotkey('ArrowUp', event.keyboardEvent)
    const focusBlockObject = getFocusBlockObject({context})
    const previousBlock = getPreviousBlock({context})

    return isArrowUp && focusBlockObject && !previousBlock
  },
  actions: [
    () => [
      {type: 'insert.text block', placement: 'before'},
      {type: 'select.previous block'},
    ],
  ],
})

const breakingBlockObject = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const focusBlockObject = getFocusBlockObject({context})
    const collapsedSelection = selectionIsCollapsed({context})

    return collapsedSelection && focusBlockObject !== undefined
  },
  actions: [() => [{type: 'insert.text block', placement: 'after'}]],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({context}) => {
    const focusTextBlock = getFocusTextBlock({context})
    const selectionCollapsed = selectionIsCollapsed({context})
    const previousBlock = getPreviousBlock({context})

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
        type: 'delete.block',
        blockPath: focusTextBlock.path,
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
  on: 'delete.forward',
  guard: ({context}) => {
    const focusTextBlock = getFocusTextBlock({context})
    const selectionCollapsed = selectionIsCollapsed({context})
    const nextBlock = getNextBlock({context})

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
        type: 'delete.block',
        blockPath: focusTextBlock.path,
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

export const coreBlockObjectBehaviors = {
  arrowDownOnLonelyBlockObject,
  arrowUpOnLonelyBlockObject,
  breakingBlockObject,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
}
