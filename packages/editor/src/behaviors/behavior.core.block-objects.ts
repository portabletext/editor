import {isTextBlock} from '../internal-utils/parse-blocks'
import {defaultKeyboardShortcuts} from '../keyboard-shortcuts/default-keyboard-shortcuts'
import * as selectors from '../selectors'
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

    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

    return focusBlockObject && !nextBlock
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

    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

    return focusBlockObject && !previousBlock
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
    const focusBlockObject = selectors.getFocusBlockObject(snapshot)
    const collapsedSelection = selectors.isSelectionCollapsed(snapshot)

    return collapsedSelection && focusBlockObject !== undefined
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

    if (
      snapshot.context.selection &&
      !selectors.isSelectionCollapsed(snapshot)
    ) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })
    const previousBlock = selectors.getPreviousBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })

    return (
      event.position.isEditor &&
      event.position.block === 'start' &&
      focusBlockObject &&
      !previousBlock
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

    if (
      snapshot.context.selection &&
      !selectors.isSelectionCollapsed(snapshot)
    ) {
      return false
    }

    const focusBlockObject = selectors.getFocusBlockObject({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })
    const nextBlock = selectors.getNextBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })

    return (
      event.position.isEditor &&
      event.position.block === 'end' &&
      focusBlockObject &&
      !nextBlock
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
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

    if (!focusTextBlock || !selectionCollapsed || !previousBlock) {
      return false
    }

    if (
      isEmptyTextBlock(snapshot.context, focusTextBlock.node) &&
      !isTextBlock(snapshot.context, previousBlock.node)
    ) {
      return {focusTextBlock, previousBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock, previousBlock}) => [
      raise({
        type: 'delete.block',
        at: focusTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
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
      isEmptyTextBlock(snapshot.context, focusTextBlock.node) &&
      !isTextBlock(snapshot.context, nextBlock.node)
    ) {
      return {focusTextBlock, nextBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock, nextBlock}) => [
      raise({
        type: 'delete.block',
        at: focusTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
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
