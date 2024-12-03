import {isHotkey} from '../../utils/is-hotkey'
import {defineBehavior} from './behavior.types'
import {
  getFocusBlock,
  getNextBlock,
  getPreviousBlock,
  selectionIsCollapsed,
} from './behavior.utils'

/**
 * @alpha
 */
export type CodeEditorBehaviorsConfig = {
  moveBlockUpShortcut: string
  moveBlockDownShortcut: string
}

/**
 * @alpha
 */
export function createCodeEditorBehaviors(config: CodeEditorBehaviorsConfig) {
  return [
    defineBehavior({
      on: 'key.down',
      guard: ({context, event}) => {
        const isAltArrowUp = isHotkey(
          config.moveBlockUpShortcut,
          event.keyboardEvent,
        )

        if (!isAltArrowUp || !selectionIsCollapsed(context)) {
          return false
        }

        const focusBlock = getFocusBlock(context)
        const previousBlock = getPreviousBlock(context)

        if (focusBlock && previousBlock) {
          return {focusBlock, previousBlock}
        }

        return false
      },
      actions: [
        (_, {focusBlock, previousBlock}) => [
          {
            type: 'move block',
            blockPath: focusBlock.path,
            to: previousBlock.path,
          },
        ],
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({context, event}) => {
        const isAltArrowDown = isHotkey(
          config.moveBlockDownShortcut,
          event.keyboardEvent,
        )

        if (!isAltArrowDown || !selectionIsCollapsed(context)) {
          return false
        }

        const focusBlock = getFocusBlock(context)
        const nextBlock = getNextBlock(context)

        if (focusBlock && nextBlock) {
          return {focusBlock, nextBlock}
        }

        return false
      },
      actions: [
        (_, {focusBlock, nextBlock}) => [
          {
            type: 'move block',
            blockPath: focusBlock.path,
            to: nextBlock.path,
          },
        ],
      ],
    }),
  ]
}
