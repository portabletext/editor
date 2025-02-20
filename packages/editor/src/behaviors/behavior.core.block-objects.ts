import {isPortableTextTextBlock} from '@sanity/types'
import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {defineBehavior, raise} from './behavior.types'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({snapshot, event}) => {
    const isArrowDown = isHotkey('ArrowDown', event.keyboardEvent)
    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

    return isArrowDown && focusBlockObject && !nextBlock
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'after'})]],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'key.down',
  guard: ({snapshot, event}) => {
    const isArrowUp = isHotkey('ArrowUp', event.keyboardEvent)
    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

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
  guard: ({snapshot}) => {
    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    return collapsedSelection && focusBlockObject !== undefined
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'after'})]],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

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
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

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
