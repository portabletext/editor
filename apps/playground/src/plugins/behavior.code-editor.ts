import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'

export type CodeEditorBehaviorsConfig = {
  moveBlockUpShortcut: KeyboardShortcut
  moveBlockDownShortcut: KeyboardShortcut
}

export function createCodeEditorBehaviors(config: CodeEditorBehaviorsConfig) {
  return [
    defineBehavior({
      name: 'codeEditor:moveBlockUp',
      on: 'keyboard.keydown',
      guard: ({snapshot, event}) => {
        const isMoveUpShortcut = config.moveBlockUpShortcut.guard(
          event.originEvent,
        )
        const firstBlock = selectors.getFirstBlock(snapshot)
        const selectedBlocks = selectors.getSelectedBlocks(snapshot)
        const blocksAbove =
          firstBlock?.node._key !== selectedBlocks[0]?.node._key

        if (!isMoveUpShortcut || !blocksAbove) {
          return false
        }

        return {paths: selectedBlocks.map((block) => block.path)}
      },
      actions: [
        (_, {paths}) =>
          paths.map((at) =>
            raise({
              type: 'move.block up',
              at,
            }),
          ),
      ],
    }),
    defineBehavior({
      name: 'codeEditor:moveBlockDown',
      on: 'keyboard.keydown',
      guard: ({snapshot, event}) => {
        const isMoveDownShortcut = config.moveBlockDownShortcut.guard(
          event.originEvent,
        )
        const lastBlock = selectors.getLastBlock(snapshot)
        const selectedBlocks = selectors.getSelectedBlocks(snapshot)
        const blocksBelow =
          lastBlock?.node._key !==
          selectedBlocks[selectedBlocks.length - 1]?.node._key

        if (!isMoveDownShortcut || !blocksBelow) {
          return false
        }

        return {paths: selectedBlocks.map((block) => block.path).reverse()}
      },
      actions: [
        (_, {paths}) =>
          paths.map((at) =>
            raise({
              type: 'move.block down',
              at,
            }),
          ),
      ],
    }),
  ]
}
