import {isPortableTextTextBlock} from '@sanity/types'
import {isHotkey} from '../../utils/is-hotkey'
import {defineBehavior} from './behavior.types'
import {
  getFocusBlockObject,
  getFocusTextBlock,
  getNextBlock,
  getPreviousBlock,
  isEmptyTextBlock,
  selectionIsCollapsed,
} from './behavior.utils'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({state, event}) => {
    const isArrowDown = isHotkey('ArrowDown', event.keyboardEvent)
    const focusBlockObject = getFocusBlockObject(state)
    const nextBlock = getNextBlock(state)

    return isArrowDown && focusBlockObject && !nextBlock
  },
  actions: [() => [{type: 'insert.text block', placement: 'after'}]],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({state, event}) => {
    const isArrowUp = isHotkey('ArrowUp', event.keyboardEvent)
    const focusBlockObject = getFocusBlockObject(state)
    const previousBlock = getPreviousBlock(state)

    return isArrowUp && focusBlockObject && !previousBlock
  },
  actions: [
    () => [
      {type: 'insert.text block', placement: 'before'},
      {type: 'select previous block'},
    ],
  ],
})

const breakingBlockObject = defineBehavior({
  on: 'insert.break',
  guard: ({state}) => {
    const focusBlockObject = getFocusBlockObject(state)
    const collapsedSelection = selectionIsCollapsed(state)

    return collapsedSelection && focusBlockObject !== undefined
  },
  actions: [() => [{type: 'insert.text block', placement: 'after'}]],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({state}) => {
    const focusTextBlock = getFocusTextBlock(state)
    const selectionCollapsed = selectionIsCollapsed(state)
    const previousBlock = getPreviousBlock(state)

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
    ({focusTextBlock, previousBlock}) => [
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
  guard: ({state}) => {
    const focusTextBlock = getFocusTextBlock(state)
    const selectionCollapsed = selectionIsCollapsed(state)
    const nextBlock = getNextBlock(state)

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
    ({focusTextBlock, nextBlock}) => [
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
