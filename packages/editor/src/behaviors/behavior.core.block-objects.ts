import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {isTextBlock} from '@portabletext/schema'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isListBlock} from '../utils/parse-blocks'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const arrowRight = createKeyboardShortcut({
  default: [
    {key: 'ArrowRight', alt: false, ctrl: false, meta: false, shift: false},
  ],
})

const arrowLeft = createKeyboardShortcut({
  default: [
    {key: 'ArrowLeft', alt: false, ctrl: false, meta: false, shift: false},
  ],
})

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

    const focusBlockObject = getFocusBlockObject(snapshot)
    const nextBlock = getNextBlock(snapshot)

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

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(snapshot)
    const previousBlock = getPreviousBlock(snapshot)

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
    const focusBlockObject = getFocusBlockObject(snapshot)
    const collapsedSelection = isSelectionCollapsed(snapshot)

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

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusBlockObject = getFocusBlockObject({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })
    const previousBlock = getPreviousBlock({
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

    if (snapshot.context.selection && !isSelectionCollapsed(snapshot)) {
      return false
    }

    const focusBlockObject = getFocusBlockObject({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection: event.position.selection,
      },
    })
    const nextBlock = getNextBlock({
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
    const focusTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)
    const previousBlock = getPreviousBlock(snapshot)

    if (!focusTextBlock || !selectionCollapsed || !previousBlock) {
      return false
    }

    if (isListBlock(snapshot.context, focusTextBlock.node)) {
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
    const focusTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)
    const nextBlock = getNextBlock(snapshot)

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

const arrowRightIntoBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!arrowRight.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }

    if (!isAtTheEndOfBlock(focusTextBlock)(snapshot)) {
      return false
    }

    const nextBlock = getNextBlock(snapshot)

    if (!nextBlock || isTextBlock(snapshot.context, nextBlock.node)) {
      return false
    }

    return {nextBlock}
  },
  actions: [
    (_, {nextBlock}) => [
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

const arrowLeftIntoBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!arrowLeft.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }

    if (!isAtTheStartOfBlock(focusTextBlock)(snapshot)) {
      return false
    }

    const previousBlock = getPreviousBlock(snapshot)

    if (!previousBlock || isTextBlock(snapshot.context, previousBlock.node)) {
      return false
    }

    return {previousBlock}
  },
  actions: [
    (_, {previousBlock}) => [
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

const arrowRightFromBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!arrowRight.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(snapshot)

    if (!focusBlockObject) {
      return false
    }

    const nextBlock = getNextBlock(snapshot)

    return nextBlock ? {nextBlock} : false
  },
  actions: [
    (_, {nextBlock}) => [
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

const arrowLeftFromBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!arrowLeft.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(snapshot)

    if (!focusBlockObject) {
      return false
    }

    const previousBlock = getPreviousBlock(snapshot)

    return previousBlock ? {previousBlock} : false
  },
  actions: [
    (_, {previousBlock}) => [
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

const deleteForwardIntoBlockObject = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }

    if (isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    if (!isAtTheEndOfBlock(focusTextBlock)(snapshot)) {
      return false
    }

    const nextBlock = getNextBlock(snapshot)

    if (!nextBlock || isTextBlock(snapshot.context, nextBlock.node)) {
      return false
    }

    return {nextBlock}
  },
  actions: [
    (_, {nextBlock}) => [
      raise({
        type: 'delete.block',
        at: nextBlock.path,
      }),
    ],
  ],
})

const deleteBackwardIntoBlockObject = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }

    if (isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    if (!isAtTheStartOfBlock(focusTextBlock)(snapshot)) {
      return false
    }

    const previousBlock = getPreviousBlock(snapshot)

    if (!previousBlock || isTextBlock(snapshot.context, previousBlock.node)) {
      return false
    }

    return {previousBlock}
  },
  actions: [
    (_, {previousBlock}) => [
      raise({
        type: 'delete.block',
        at: previousBlock.path,
      }),
    ],
  ],
})

const deleteSelectedBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.delete.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(snapshot)

    return focusBlockObject ? {focusBlockObject} : false
  },
  actions: [
    ({snapshot}, {focusBlockObject}) => {
      const nextBlock = getNextBlock(snapshot)
      const previousBlock = getPreviousBlock(snapshot)

      if (nextBlock) {
        return [
          raise({type: 'delete.block', at: focusBlockObject.path}),
          raise({
            type: 'select',
            at: {
              anchor: {path: nextBlock.path, offset: 0},
              focus: {path: nextBlock.path, offset: 0},
            },
          }),
        ]
      }

      if (previousBlock) {
        const endPoint = getBlockEndPoint({
          context: snapshot.context,
          block: previousBlock,
        })

        return [
          raise({type: 'delete.block', at: focusBlockObject.path}),
          raise({
            type: 'select',
            at: {
              anchor: endPoint,
              focus: endPoint,
            },
          }),
        ]
      }

      return [raise({type: 'delete.block', at: focusBlockObject.path})]
    },
  ],
})

const backspaceSelectedBlockObject = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.backspace.guard(event.originEvent)) {
      return false
    }

    const collapsedSelection = isSelectionCollapsed(snapshot)

    if (!collapsedSelection) {
      return false
    }

    const focusBlockObject = getFocusBlockObject(snapshot)

    return focusBlockObject ? {focusBlockObject} : false
  },
  actions: [
    ({snapshot}, {focusBlockObject}) => {
      const previousBlock = getPreviousBlock(snapshot)
      const nextBlock = getNextBlock(snapshot)

      if (previousBlock) {
        const endPoint = getBlockEndPoint({
          context: snapshot.context,
          block: previousBlock,
        })

        return [
          raise({type: 'delete.block', at: focusBlockObject.path}),
          raise({
            type: 'select',
            at: {
              anchor: endPoint,
              focus: endPoint,
            },
          }),
        ]
      }

      if (nextBlock) {
        return [
          raise({type: 'delete.block', at: focusBlockObject.path}),
          raise({
            type: 'select',
            at: {
              anchor: {path: nextBlock.path, offset: 0},
              focus: {path: nextBlock.path, offset: 0},
            },
          }),
        ]
      }

      return [raise({type: 'delete.block', at: focusBlockObject.path})]
    },
  ],
})

export const coreBlockObjectBehaviors = {
  arrowRightIntoBlockObject,
  arrowLeftIntoBlockObject,
  arrowRightFromBlockObject,
  arrowLeftFromBlockObject,
  deleteForwardIntoBlockObject,
  deleteBackwardIntoBlockObject,
  deleteSelectedBlockObject,
  backspaceSelectedBlockObject,
  arrowDownOnLonelyBlockObject,
  arrowUpOnLonelyBlockObject,
  breakingBlockObject,
  clickingAboveLonelyBlockObject,
  clickingBelowLonelyBlockObject,
  deletingEmptyTextBlockAfterBlockObject,
  deletingEmptyTextBlockBeforeBlockObject,
}
