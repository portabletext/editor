import {isHotkey} from '../../utils/is-hotkey'
import {defineBehavior} from './behavior.types'
import {getFocusBlock, selectionIsCollapsed} from './behavior.utils'

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
        const at = getFocusBlock(context)?.path

        if (!isAltArrowUp || !selectionIsCollapsed(context) || !at) {
          return false
        }

        return {at}
      },
      actions: [
        (_, {at}) => [
          {
            type: 'move block up',
            at,
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
        const at = getFocusBlock(context)?.path

        if (!isAltArrowDown || !selectionIsCollapsed(context) || !at) {
          return false
        }

        return {at}
      },
      actions: [
        (_, {at}) => [
          {
            type: 'move block down',
            at,
          },
        ],
      ],
    }),
  ]
}
