import {isSpan} from '@portabletext/schema'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {isEditableContainer} from '../schema/is-editable-container'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {getLeaf} from '../traversal/get-leaf'
import {getSibling} from '../traversal/get-sibling'
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

    const nextBlock = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'next',
    })

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

    const previousBlock = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'previous',
    })

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

    const previousSibling = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'previous',
    })

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

    const nextSibling = getSibling(snapshot, focusedBlockObject.path, {
      direction: 'next',
    })

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

    const previousSibling = getSibling(snapshot, focusedTextBlock.path, {
      direction: 'previous',
    })

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
      // Land the caret at the END of the previous sibling's deepest leaf.
      // A span leaf gets the end of its text, anything else (void block-object,
      // inline-object) gets focused at its own path.
      const leaf = getLeaf(snapshot, previousSibling.path, {edge: 'end'})
      const previousEndPoint = leaf
        ? {
            path: leaf.path,
            offset: isSpan(snapshot.context, leaf.node)
              ? leaf.node.text.length
              : 0,
          }
        : {path: previousSibling.path, offset: 0}

      return {focusedTextBlock, previousEndPoint}
    }

    return false
  },
  actions: [
    (_, {focusedTextBlock, previousEndPoint}) => [
      raise({
        type: 'delete.block',
        at: focusedTextBlock.path,
      }),
      raise({
        type: 'select',
        at: {
          anchor: previousEndPoint,
          focus: previousEndPoint,
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

    const nextSibling = getSibling(snapshot, focusedTextBlock.path, {
      direction: 'next',
    })

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

/**
 * A container selected as a block-object: a collapsed selection whose focus
 * resolves to the container itself (held at the container path by
 * `resolveSelectionPoint`), not to a leaf inside it. `getFocusBlock` returns
 * the container only in that case; a caret inside resolves to the inner block.
 */
function getSelectedContainer(snapshot: Parameters<typeof getFocusBlock>[0]) {
  if (!isSelectionCollapsed(snapshot)) {
    return undefined
  }

  const focusBlock = getFocusBlock(snapshot)

  if (
    !focusBlock ||
    !isEditableContainer(snapshot, focusBlock.node, focusBlock.path)
  ) {
    return undefined
  }

  return focusBlock
}

const deletingSelectedContainerBackward = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const container = getSelectedContainer(snapshot)
    return container ? {container} : false
  },
  actions: [(_, {container}) => [raise({type: 'unset', at: container.path})]],
})

const deletingSelectedContainerForward = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const container = getSelectedContainer(snapshot)
    return container ? {container} : false
  },
  actions: [(_, {container}) => [raise({type: 'unset', at: container.path})]],
})

const arrowDownOnSelectedContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.arrowDown.guard(event.originEvent)) {
      return false
    }

    const container = getSelectedContainer(snapshot)

    if (!container) {
      return false
    }

    const nextBlock = getSibling(snapshot, container.path, {direction: 'next'})

    return nextBlock ? {nextBlock} : false
  },
  actions: [
    (_, {nextBlock}) => [raise({type: 'select.block', at: nextBlock.path})],
  ],
})

const arrowUpOnSelectedContainer = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.arrowUp.guard(event.originEvent)) {
      return false
    }

    const container = getSelectedContainer(snapshot)

    if (!container) {
      return false
    }

    const previousBlock = getSibling(snapshot, container.path, {
      direction: 'previous',
    })

    return previousBlock ? {previousBlock} : false
  },
  actions: [
    (_, {previousBlock}) => [
      raise({type: 'select.block', at: previousBlock.path, select: 'end'}),
    ],
  ],
})

export const coreBlockObjectBehaviors = {
  arrowDownOnLonelyBlockObject,
  arrowUpOnLonelyBlockObject,
  arrowDownOnSelectedContainer,
  arrowUpOnSelectedContainer,
  breakingBlockObject,
  clickingAboveLonelyBlockObject,
  clickingBelowLonelyBlockObject,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
  deletingSelectedContainerBackward,
  deletingSelectedContainerForward,
}
