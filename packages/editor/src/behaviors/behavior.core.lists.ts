import {createGuards} from '../behavior-actions/behavior.guards'
import {isHotkey} from '../internal-utils/is-hotkey'
import * as selectors from '../selectors'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {defineBehavior, raise} from './behavior.types'

const MAX_LIST_LEVEL = 10

const toggleListItemOff = defineBehavior({
  on: 'list item.toggle',
  guard: ({context, event}) =>
    selectors.isActiveListItem(event.listItem)({context}),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.remove',
        listItem: event.listItem,
      }),
    ],
  ],
})

const toggleListItemOn = defineBehavior({
  on: 'list item.toggle',
  guard: ({context, event}) =>
    !selectors.isActiveListItem(event.listItem)({context}),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.add',
        listItem: event.listItem,
      }),
    ],
  ],
})

const clearListOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({context}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed({context})
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const focusSpan = selectors.getFocusSpan({context})

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      context.selection?.focus.offset === 0

    if (atTheBeginningOfBLock && focusTextBlock.node.level === 1) {
      return {focusTextBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock}) => [
      raise({
        type: 'text block.unset',
        props: ['listItem', 'level'],
        at: focusTextBlock.path,
      }),
    ],
  ],
})

const unindentListOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({context}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed({context})
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const focusSpan = selectors.getFocusSpan({context})

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      context.selection?.focus.offset === 0

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
        type: 'text block.set',
        level,
        at: focusTextBlock.path,
      }),
    ],
  ],
})

const clearListOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const selectionCollapsed = selectors.isSelectionCollapsed({context})
    const focusListBlock = selectors.getFocusListBlock({context})

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
        type: 'text block.unset',
        props: ['listItem', 'level'],
        at: focusListBlock.path,
      }),
    ],
  ],
})

const indentListOnTab = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isTab = isHotkey('Tab', event.keyboardEvent)

    if (!isTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks({context})
    const guards = createGuards(context)
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
          type: 'text block.set',
          level: Math.min(
            MAX_LIST_LEVEL,
            Math.max(1, selectedListBlock.node.level + 1),
          ),
          at: selectedListBlock.path,
        }),
      ),
  ],
})

const unindentListOnShiftTab = defineBehavior({
  on: 'key.down',
  guard: ({context, event}) => {
    const isShiftTab = isHotkey('Shift+Tab', event.keyboardEvent)

    if (!isShiftTab) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks({context})
    const guards = createGuards(context)
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
          type: 'text block.set',
          level: Math.min(
            MAX_LIST_LEVEL,
            Math.max(1, selectedListBlock.node.level - 1),
          ),
          at: selectedListBlock.path,
        }),
      ),
  ],
})

export const coreListBehaviors = {
  toggleListItemOff,
  toggleListItemOn,
  clearListOnBackspace,
  unindentListOnBackspace,
  clearListOnEnter,
  indentListOnTab,
  unindentListOnShiftTab,
}
