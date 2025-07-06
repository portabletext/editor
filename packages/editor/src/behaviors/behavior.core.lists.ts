import {isListBlock, isTextBlock} from '../internal-utils/parse-blocks'
import {defaultKeyboardShortcuts} from '../keyboard-shortcuts/default-keyboard-shortcuts'
import * as selectors from '../selectors'
import {getBlockEndPoint} from '../utils'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const MAX_LIST_LEVEL = 10

const clearListOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const focusSpan = selectors.getFocusSpan(snapshot)

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      snapshot.context.selection?.focus.offset === 0

    if (atTheBeginningOfBLock && focusTextBlock.node.level === 1) {
      return {focusTextBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock}) => [
      raise({
        type: 'block.unset',
        props: ['listItem', 'level'],
        at: focusTextBlock.path,
      }),
    ],
  ],
})

const unindentListOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const focusSpan = selectors.getFocusSpan(snapshot)

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      snapshot.context.selection?.focus.offset === 0

    if (
      atTheBeginningOfBLock &&
      focusTextBlock.node.level !== undefined &&
      focusTextBlock.node.level > 1
    ) {
      return {focusTextBlock, level: focusTextBlock.node.level - 1}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock, level}) => [
      raise({
        type: 'block.set',
        props: {level},
        at: focusTextBlock.path,
      }),
    ],
  ],
})

/**
 * Hitting Delete in an empty list item would delete it by default. Instead,
 * then text block below should be merged into it, preserving the list
 * properties.
 */
const mergeTextIntoListOnDelete = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const focusListBlock = selectors.getFocusListBlock(snapshot)
    const nextBlock = selectors.getNextBlock(snapshot)

    if (!focusListBlock || !nextBlock) {
      return false
    }

    if (!isTextBlock(snapshot.context, nextBlock.node)) {
      return false
    }

    if (!isEmptyTextBlock(snapshot.context, focusListBlock.node)) {
      return false
    }

    return {focusListBlock, nextBlock}
  },
  actions: [
    (_, {nextBlock}) => [
      raise({
        type: 'insert.block',
        block: nextBlock.node,
        placement: 'auto',
        select: 'start',
      }),
      raise({
        type: 'delete.block',
        at: nextBlock.path,
      }),
    ],
  ],
})

/**
 * Hitting Backspace before an empty list item would delete it by default.
 * Instead, the text block below should be merged into it, preserving the list
 * properties.
 */
const mergeTextIntoListOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const previousBlock = selectors.getPreviousBlock(snapshot)

    if (!focusTextBlock || !previousBlock) {
      return false
    }

    if (!isListBlock(snapshot.context, previousBlock.node)) {
      return false
    }

    if (!isEmptyTextBlock(snapshot.context, previousBlock.node)) {
      return false
    }

    const previousBlockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: previousBlock,
    })

    return {focusTextBlock, previousBlockEndPoint}
  },
  actions: [
    (_, {focusTextBlock, previousBlockEndPoint}) => [
      raise({
        type: 'select',
        at: {
          anchor: previousBlockEndPoint,
          focus: previousBlockEndPoint,
        },
      }),
      raise({
        type: 'insert.block',
        block: focusTextBlock.node,
        placement: 'auto',
        select: 'start',
      }),
      raise({
        type: 'delete.block',
        at: focusTextBlock.path,
      }),
    ],
  ],
})

/**
 * Hitting Enter in an empty list item would create a new list item below by
 * default. Instead, the list properties should be cleared.
 */
const clearListOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const focusListBlock = selectors.getFocusListBlock(snapshot)

    if (
      !selectionCollapsed ||
      !focusListBlock ||
      !isEmptyTextBlock(snapshot.context, focusListBlock.node)
    ) {
      return false
    }

    return {focusListBlock}
  },
  actions: [
    (_, {focusListBlock}) => [
      raise({
        type: 'block.unset',
        props: ['listItem', 'level'],
        at: focusListBlock.path,
      }),
    ],
  ],
})

/**
 * Hitting Tab should indent the list item.
 */
const indentListOnTab = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isTab = defaultKeyboardShortcuts.tab.guard(event.originEvent)

    if (!isTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks(snapshot)
    const selectedListBlocks = selectedBlocks.flatMap((block) =>
      isListBlock(snapshot.context, block.node)
        ? [
            {
              node: block.node,
              path: block.path,
            },
          ]
        : [],
    )

    if (selectedListBlocks.length === selectedBlocks.length) {
      return {selectedListBlocks}
    }

    return false
  },
  actions: [
    (_, {selectedListBlocks}) =>
      selectedListBlocks.map((selectedListBlock) =>
        raise({
          type: 'block.set',
          props: {
            level: Math.min(
              MAX_LIST_LEVEL,
              Math.max(1, selectedListBlock.node.level + 1),
            ),
          },
          at: selectedListBlock.path,
        }),
      ),
  ],
})

/**
 * Hitting Shift+Tab should unindent the list item.
 */
const unindentListOnShiftTab = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    const isShiftTab = defaultKeyboardShortcuts.shiftTab.guard(
      event.originEvent,
    )

    if (!isShiftTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks(snapshot)
    const selectedListBlocks = selectedBlocks.flatMap((block) =>
      isListBlock(snapshot.context, block.node)
        ? [
            {
              node: block.node,
              path: block.path,
            },
          ]
        : [],
    )

    if (selectedListBlocks.length === selectedBlocks.length) {
      return {selectedListBlocks}
    }

    return false
  },
  actions: [
    (_, {selectedListBlocks}) =>
      selectedListBlocks.map((selectedListBlock) =>
        raise({
          type: 'block.set',
          props: {
            level: Math.min(
              MAX_LIST_LEVEL,
              Math.max(1, selectedListBlock.node.level - 1),
            ),
          },
          at: selectedListBlock.path,
        }),
      ),
  ],
})

/**
 * An inserted list inherits the `level` from the list item where it's
 * inserted. The entire list tree is adjusted to match the new level.
 */
const inheritListLevel = defineBehavior({
  on: 'insert.blocks',
  guard: ({snapshot, event}) => {
    const focusListBlock = selectors.getFocusListBlock(snapshot)

    if (!focusListBlock) {
      return false
    }

    const firstInsertedBlock = event.blocks.at(0)
    const secondInsertedBlock = event.blocks.at(1)
    const insertedListBlock = isListBlock(snapshot.context, firstInsertedBlock)
      ? firstInsertedBlock
      : isListBlock(snapshot.context, secondInsertedBlock)
        ? secondInsertedBlock
        : undefined

    if (!insertedListBlock) {
      return false
    }

    const levelDifference = focusListBlock.node.level - insertedListBlock.level

    if (levelDifference === 0) {
      return false
    }

    return {levelDifference, insertedListBlock}
  },
  actions: [
    ({snapshot, event}, {levelDifference, insertedListBlock}) => {
      let adjustLevel = true
      let listStartBlockFound = false

      return [
        raise({
          ...event,
          blocks: event.blocks.map((block) => {
            if (block._key === insertedListBlock._key) {
              listStartBlockFound = true
            }

            if (!adjustLevel) {
              return block
            }

            if (
              listStartBlockFound &&
              adjustLevel &&
              isListBlock(snapshot.context, block)
            ) {
              return {
                ...block,
                level: Math.min(
                  MAX_LIST_LEVEL,
                  Math.max(1, block.level + levelDifference),
                ),
              }
            }

            if (listStartBlockFound) {
              adjustLevel = false
            }

            return block
          }),
        }),
      ]
    },
  ],
})

/**
 * An inserted list inherits the `listItem` from the list item at the level
 * it's inserted.
 */
const inheritListItem = defineBehavior({
  on: 'insert.blocks',
  guard: ({snapshot, event}) => {
    const focusListBlock = selectors.getFocusListBlock(snapshot)

    if (!focusListBlock) {
      return false
    }

    if (isEmptyTextBlock(snapshot.context, focusListBlock.node)) {
      return false
    }

    const firstInsertedBlock = event.blocks.at(0)
    const secondInsertedBlock = event.blocks.at(1)
    const insertedListBlock = isListBlock(snapshot.context, firstInsertedBlock)
      ? firstInsertedBlock
      : isListBlock(snapshot.context, secondInsertedBlock)
        ? secondInsertedBlock
        : undefined

    if (!insertedListBlock) {
      return false
    }

    if (focusListBlock.node.level !== insertedListBlock.level) {
      return false
    }

    if (focusListBlock.node.listItem === insertedListBlock.listItem) {
      return false
    }

    return {listItem: focusListBlock.node.listItem, insertedListBlock}
  },
  actions: [
    ({snapshot, event}, {listItem, insertedListBlock}) => {
      let adjustListItem = true
      let listStartBlockFound = false

      return [
        raise({
          ...event,
          blocks: event.blocks.map((block) => {
            if (block._key === insertedListBlock._key) {
              listStartBlockFound = true
            }

            if (!adjustListItem) {
              return block
            }

            if (
              listStartBlockFound &&
              adjustListItem &&
              isListBlock(snapshot.context, block)
            ) {
              return {
                ...block,
                listItem:
                  block.level === insertedListBlock.level
                    ? listItem
                    : block.listItem,
              }
            }

            if (listStartBlockFound) {
              adjustListItem = false
            }

            return block
          }),
        }),
      ]
    },
  ],
})

/**
 * An inserted text block inherits the `listItem` and `level` from the list
 * item where it's inserted.
 */
const inheritListProperties = defineBehavior({
  on: 'insert.block',
  guard: ({snapshot, event}) => {
    if (event.placement !== 'auto') {
      return false
    }

    if (event.block._type !== snapshot.context.schema.block.name) {
      return false
    }

    if (event.block.listItem !== undefined) {
      return false
    }

    const focusListBlock = selectors.getFocusListBlock(snapshot)

    if (!focusListBlock) {
      return false
    }

    if (!isEmptyTextBlock(snapshot.context, focusListBlock.node)) {
      return false
    }

    return {
      level: focusListBlock.node.level,
      listItem: focusListBlock.node.listItem,
    }
  },
  actions: [
    ({event}, {level, listItem}) => [
      raise({
        ...event,
        block: {
          ...event.block,
          level,
          listItem,
        },
      }),
    ],
  ],
})

export const coreListBehaviors = {
  clearListOnBackspace,
  unindentListOnBackspace,
  mergeTextIntoListOnDelete,
  mergeTextIntoListOnBackspace,
  clearListOnEnter,
  indentListOnTab,
  unindentListOnShiftTab,
  inheritListLevel,
  inheritListItem,
  inheritListProperties,
}
