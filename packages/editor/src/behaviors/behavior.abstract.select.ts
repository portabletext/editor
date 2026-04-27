import {getSibling} from '../node-traversal/get-sibling'
import {getBlock} from '../node-traversal/is-block'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSelectBehaviors = [
  defineBehavior({
    on: 'select.block',
    guard: ({snapshot, event}) => {
      if (event.select !== 'end') {
        return false
      }

      const block = getBlock(snapshot.context, event.at)

      if (!block) {
        return false
      }

      const blockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block,
      })

      return {blockEndPoint}
    },
    actions: [
      (_, {blockEndPoint}) => [
        raise({
          type: 'select',
          at: {
            anchor: blockEndPoint,
            focus: blockEndPoint,
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'select.block',
    actions: [
      ({event}) => [
        raise({
          type: 'select',
          at: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: 0,
            },
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'select.previous block',
    guard: ({snapshot}) => {
      const focusBlockPath = getFocusBlock(snapshot)?.path

      if (!focusBlockPath) {
        return false
      }

      const previousSibling = getSibling(
        snapshot.context,
        focusBlockPath,
        'previous',
      )

      if (!previousSibling) {
        return false
      }

      return {previousBlock: previousSibling}
    },
    actions: [
      ({event}, {previousBlock}) => [
        raise({
          type: 'select.block',
          at: previousBlock.path,
          select: event.select,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'select.next block',
    guard: ({snapshot}) => {
      const focusBlockPath = getFocusBlock(snapshot)?.path

      if (!focusBlockPath) {
        return false
      }

      const nextSibling = getSibling(snapshot.context, focusBlockPath, 'next')

      if (!nextSibling) {
        return false
      }

      return {nextBlock: nextSibling}
    },
    actions: [
      ({event}, {nextBlock}) => [
        raise({
          type: 'select.block',
          at: nextBlock.path,
          select: event.select,
        }),
      ],
    ],
  }),
]
