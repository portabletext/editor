import {createGuards} from '../behavior-actions/behavior.guards'
import {isHotkey} from '../internal-utils/is-hotkey'
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
      !isEmptyTextBlock(focusListBlock.node)
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
    const isTab = isHotkey('Tab', event.originEvent)

    if (!isTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks(snapshot)
    const guards = createGuards(snapshot.context)
    const selectedListBlocks = selectedBlocks.flatMap((block) =>
      guards.isListBlock(block.node)
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
    const isShiftTab = isHotkey('Shift+Tab', event.originEvent)

    if (!isShiftTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks(snapshot)
    const guards = createGuards(snapshot.context)
    const selectedListBlocks = selectedBlocks.flatMap((block) =>
      guards.isListBlock(block.node)
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

export const coreListBehaviors = {
  clearListOnBackspace,
  unindentListOnBackspace,
  clearListOnEnter,
  indentListOnTab,
  unindentListOnShiftTab,
}
