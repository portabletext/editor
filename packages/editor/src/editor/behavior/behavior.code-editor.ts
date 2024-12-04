import {isHotkey} from '../../utils/is-hotkey'
import {defineBehavior} from './behavior.types'
import {getFirstBlock, getLastBlock, getSelectedBlocks} from './behavior.utils'

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
        const firstBlock = getFirstBlock(context)
        const selectedBlocks = getSelectedBlocks(context)
        const blocksAbove =
          firstBlock?.node._key !== selectedBlocks[0]?.node._key

        if (!isAltArrowUp || !blocksAbove) {
          return false
        }

        return {paths: selectedBlocks.map((block) => block.path)}
      },
      actions: [
        (_, {paths}) =>
          paths.map((at) => ({
            type: 'move block up',
            at,
          })),
      ],
    }),
    defineBehavior({
      on: 'key.down',
      guard: ({context, event}) => {
        const isAltArrowDown = isHotkey(
          config.moveBlockDownShortcut,
          event.keyboardEvent,
        )
        const lastBlock = getLastBlock(context)
        const selectedBlocks = getSelectedBlocks(context)
        const blocksBelow =
          lastBlock?.node._key !==
          selectedBlocks[selectedBlocks.length - 1]?.node._key

        if (!isAltArrowDown || !blocksBelow) {
          return false
        }

        return {paths: selectedBlocks.map((block) => block.path).reverse()}
      },
      actions: [
        (_, {paths}) =>
          paths.map((at) => ({
            type: 'move block down',
            at,
          })),
      ],
    }),
  ]
}
