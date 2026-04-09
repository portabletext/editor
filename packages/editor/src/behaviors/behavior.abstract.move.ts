import {getNextBlock, getPreviousBlock} from '../traversal'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractMoveBehaviors = [
  defineBehavior({
    on: 'move.block up',
    guard: ({snapshot, event}) => {
      const previousBlock = getPreviousBlock(snapshot, {at: event.at})

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
      const nextBlock = getNextBlock(snapshot, {at: event.at})

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
