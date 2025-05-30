import {getNextBlock, getPreviousBlock} from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractMoveBehaviors = [
  defineBehavior({
    on: 'move.block up',
    guard: ({snapshot, event}) => {
      const previousBlock = getPreviousBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: 0,
            },
          },
        },
      })

      if (previousBlock) {
        return {previousBlock}
      }

      return false
    },
    actions: [
      ({event}, {previousBlock}) => [
        raise({
          type: 'move.block',
          at: event.at,
          to: previousBlock.path,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'move.block down',
    guard: ({snapshot, event}) => {
      const nextBlock = getNextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: 0,
            },
          },
        },
      })

      if (nextBlock) {
        return {nextBlock}
      }

      return false
    },
    actions: [
      ({event}, {nextBlock}) => [
        raise({
          type: 'move.block',
          at: event.at,
          to: nextBlock.path,
        }),
      ],
    ],
  }),
]
