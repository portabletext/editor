import {isPortableTextTextBlock} from '@sanity/types'
import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {defineBehavior, raise} from './behavior.types'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isArrowDown = isHotkey('ArrowDown', event.keyboardEvent)
    const focusBlockObject = selectors.getFocusBlockObject({context})
    const nextBlock = selectors.getNextBlock({context})

    return isArrowDown && focusBlockObject && !nextBlock
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'after'})]],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isArrowUp = isHotkey('ArrowUp', event.keyboardEvent)
    const focusBlockObject = selectors.getFocusBlockObject({context})
    const previousBlock = selectors.getPreviousBlock({context})

    return isArrowUp && focusBlockObject && !previousBlock
  },
  actions: [
    () => [
      raise({type: 'insert.text block', placement: 'before'}),
      raise({type: 'select.previous block'}),
    ],
  ],
})

const breakingBlockObject = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const focusBlockObject = selectors.getFocusBlockObject({context})
    const collapsedSelection = selectors.isSelectionCollapsed({context})

    return collapsedSelection && focusBlockObject !== undefined
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'after'})]],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({context}) => {
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const selectionCollapsed = selectors.isSelectionCollapsed({context})
    const previousBlock = selectors.getPreviousBlock({context})

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
      raise({
        type: 'delete.block',
        blockPath: focusTextBlock.path,
      }),
      raise({
        type: 'select',
        selection: {
          anchor: {path: previousBlock.path, offset: 0},
          focus: {path: previousBlock.path, offset: 0},
        },
      }),
    ],
  ],
})

const deletingEmptyTextBlockBeforeBlockObject = defineBehavior({
  on: 'delete.forward',
  guard: ({context}) => {
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const selectionCollapsed = selectors.isSelectionCollapsed({context})
    const nextBlock = selectors.getNextBlock({context})

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
      raise({
        type: 'delete.block',
        blockPath: focusTextBlock.path,
      }),
      raise({
        type: 'select',
        selection: {
          anchor: {path: nextBlock.path, offset: 0},
          focus: {path: nextBlock.path, offset: 0},
        },
      }),
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
