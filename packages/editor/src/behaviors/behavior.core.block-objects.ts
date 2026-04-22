import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getSibling} from '../node-traversal/get-sibling'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {isListBlock} from '../utils/parse-blocks'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const arrowDownOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowDown = defaultKeyboardShortcuts.arrowDown.guard(
      event.originEvent,
    )

    if (!isArrowDown) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusedBlockObject = getFocusBlockObject(snapshot)

    if (!focusedBlockObject) {
      return false
    }

    const nextBlock = getSibling(
      snapshot.context,
      focusedBlockObject.path,
      'next',
    )

    return !nextBlock
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
      }),
    ],
  ],
})

const arrowUpOnLonelyBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isArrowUp = defaultKeyboardShortcuts.arrowUp.guard(event.originEvent)

    if (!isArrowUp) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusedBlockObject = getFocusBlockObject(snapshot)

    if (!focusedBlockObject) {
      return false
    }

    const previousBlock = getSibling(
      snapshot.context,
      focusedBlockObject.path,
      'previous',
    )

    return !previousBlock
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'before',
      }),
    ],
  ],
})

const breakingBlockObject = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusedBlockObject = getFocusBlockObject(snapshot)
    const collapsedSelection = isSelectionCollapsed(snapshot)

    return collapsedSelection && focusedBlockObject !== undefined
  },
  actions: [
    ({snapshot}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
      }),
    ],
  ],
})

const clickingAboveLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (snapshot.context.readOnly) {
      return false
    }

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    const positionSnapshot = {
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    }
    const focusedBlockObject = getFocusBlockObject(positionSnapshot)

    if (!focusedBlockObject) {
      return false
    }

    const previousSibling = getSibling(
      snapshot.context,
      focusedBlockObject.path,
      'previous',
    )

    return (
      (event.position.isEditor || event.position.isContainer) &&
      event.position.block === 'start' &&
      !previousSibling
    )
  },
  actions: [
    ({snapshot, event}) => [
      raise({
        type: 'select',
        at: event.position.selection,
      }),
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'before',
        select: 'start',
      }),
    ],
  ],
})

const clickingBelowLonelyBlockObject = defineBehavior({
  on: 'mouse.click',
  guard: ({snapshot, event}) => {
    if (snapshot.context.readOnly) {
      return false
    }

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    const positionSnapshot = {
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    }
    const focusedBlockObject = getFocusBlockObject(positionSnapshot)

    if (!focusedBlockObject) {
      return false
    }

    const nextSibling = getSibling(
      snapshot.context,
      focusedBlockObject.path,
      'next',
    )

    return (
      (event.position.isEditor || event.position.isContainer) &&
      event.position.block === 'end' &&
      !nextSibling
    )
  },
  actions: [
    ({snapshot, event}) => [
      raise({
        type: 'select',
        at: event.position.selection,
      }),
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
        },
        placement: 'after',
        select: 'start',
      }),
    ],
  ],
})

const deletingEmptyTextBlockAfterBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const focusedTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!focusedTextBlock || !selectionCollapsed) {
      return false
    }

    const previousSibling = getSibling(
      snapshot.context,
      focusedTextBlock.path,
      'previous',
    )

    if (!previousSibling) {
      return false
    }

    if (isListBlock(snapshot.context, focusedTextBlock.node)) {
      return false
    }

    if (
      isEmptyTextBlock(snapshot.context, focusedTextBlock.node) &&
      !isTextBlockNode(snapshot.context, previousSibling.node)
    ) {
      return {focusedTextBlock, previousSibling}
    }

    return false
  },
  actions: [
    (_, {focusedTextBlock, previousSibling}) => [
      raise({
        type: 'delete.block',
        at: focusedTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
          anchor: {path: previousSibling.path, offset: 0},
          focus: {path: previousSibling.path, offset: 0},
        },
      }),
    ],
  ],
})

const deletingEmptyTextBlockBeforeBlockObject = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const focusedTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!focusedTextBlock || !selectionCollapsed) {
      return false
    }

    const nextSibling = getSibling(
      snapshot.context,
      focusedTextBlock.path,
      'next',
    )

    if (!nextSibling) {
      return false
    }

    if (
      isEmptyTextBlock(snapshot.context, focusedTextBlock.node) &&
      !isTextBlockNode(snapshot.context, nextSibling.node)
    ) {
      return {focusedTextBlock, nextSibling}
    }

    return false
  },
  actions: [
    (_, {focusedTextBlock, nextSibling}) => [
      raise({
        type: 'delete.block',
        at: focusedTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
          anchor: {path: nextSibling.path, offset: 0},
          focus: {path: nextSibling.path, offset: 0},
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
