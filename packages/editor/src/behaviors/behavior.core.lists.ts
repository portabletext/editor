import {isListBlock} from '../internal-utils/parse-blocks'
import {defaultKeyboardShortcuts} from '../keyboard-shortcuts/default-keyboard-shortcuts'
import * as selectors from '../selectors'
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

const adjustListLevelOnInsert = defineBehavior({
  on: 'insert.blocks',
  guard: ({snapshot, event}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)

    if (!focusTextBlock) {
      return false
    }

    // Check if the focus block is a list item
    if (!isListBlock(snapshot.context, focusTextBlock.node)) {
      return false
    }

    // Check if any blocks being inserted are list items
    const listBlocks = event.blocks.filter((block) =>
      isListBlock(snapshot.context, block),
    )

    if (listBlocks.length === 0) {
      return false
    }

    // Find the minimum level among the list blocks being inserted
    const minInsertedLevel = Math.min(...listBlocks.map((block) => block.level))

    // Calculate the level difference needed
    const levelDifference = focusTextBlock.node.level - minInsertedLevel

    // Check if any adjustment is needed
    if (levelDifference === 0) {
      return false
    }

    return {
      focusTextBlock,
      levelDifference,
      targetLevel: focusTextBlock.node.level,
      blocks: event.blocks,
      context: snapshot.context,
    }
  },
  actions: [
    (_, {levelDifference, targetLevel, blocks, context}) => [
      raise({
        type: 'insert.blocks',
        blocks: blocks.map((block) =>
          isListBlock(context, block)
            ? {
                ...block,
                level: Math.min(
                  MAX_LIST_LEVEL,
                  Math.max(1, block.level + levelDifference),
                ),
              }
            : block,
        ),
        placement: 'auto',
        select: 'end',
      }),
    ],
  ],
})

export const coreListBehaviors = {
  clearListOnBackspace,
  unindentListOnBackspace,
  clearListOnEnter,
  indentListOnTab,
  unindentListOnShiftTab,
  adjustListLevelOnInsert,
}
