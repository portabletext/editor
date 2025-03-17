import {isPortableTextTextBlock} from '@sanity/types'
import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {defineBehavior, raise} from './behavior.types'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowDown = isHotkey('ArrowDown', event.originEvent)

    if (!isArrowDown) {
      return false
    }

    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

    return focusBlockObject && !nextBlock
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'after'})]],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowUp = isHotkey('ArrowUp', event.originEvent)

    if (!isArrowUp) {
      return false
    }

    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

    return focusBlockObject && !previousBlock
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'before'})]],
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

const clickingAboveLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (!selectors.isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

    return (
      event.position.isEditor &&
      event.position.block === 'start' &&
      focusBlockObject &&
      !previousBlock
    )
  },
  actions: [() => [raise({type: 'insert.text block', placement: 'before'})]],
})

const clickingBelowLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (!selectors.isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

    return (
      event.position.isEditor &&
      event.position.block === 'end' &&
      focusBlockObject &&
      !nextBlock
    )
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
  clickingAboveLonelyBlockObject,
  clickingBelowLonelyBlockObject,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
}
