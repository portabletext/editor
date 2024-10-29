import {defineBehavior} from './behavior.types'
import {
  getFocusSpan,
  getFocusTextBlock,
  selectionIsCollapsed,
} from './behavior.utils'

const clearListOnBackspace = defineBehavior({
  on: 'delete backward',
  guard: ({context}) => {
    const selectionCollapsed = selectionIsCollapsed(context)
    const focusTextBlock = getFocusTextBlock(context)
    const focusSpan = getFocusSpan(context)

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      context.selection.focus.offset === 0

    if (atTheBeginningOfBLock && focusTextBlock.node.level === 1) {
      return {focusTextBlock}
    }

    return false
  },
  actions: [
    (_, {focusTextBlock}) => [
      {
        type: 'unset block',
        props: ['listItem', 'level'],
        paths: [focusTextBlock.path],
      },
    ],
  ],
})

const unindentListOnBackspace = defineBehavior({
  on: 'delete backward',
  guard: ({context}) => {
    const selectionCollapsed = selectionIsCollapsed(context)
    const focusTextBlock = getFocusTextBlock(context)
    const focusSpan = getFocusSpan(context)

    if (!selectionCollapsed || !focusTextBlock || !focusSpan) {
      return false
    }

    const atTheBeginningOfBLock =
      focusTextBlock.node.children[0]._key === focusSpan.node._key &&
      context.selection.focus.offset === 0

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
      {
        type: 'set block',
        level,
        paths: [focusTextBlock.path],
      },
    ],
  ],
})

export const coreListBehaviors = [clearListOnBackspace, unindentListOnBackspace]
