import {getFocusBlock, getNextBlock, getPreviousBlock} from '../selectors'
import {getBlockEndPoint} from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSelectBehaviors = [
  defineBehavior({
    on: 'select.block',
    guard: ({snapshot, event}) => {
      if (event.select !== 'end') {
        return false
      }

      const block = getFocusBlock({
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
      const previousBlock = getPreviousBlock(snapshot)

      if (!previousBlock) {
        return false
      }

      return {previousBlock}
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
      const nextBlock = getNextBlock(snapshot)

      if (!nextBlock) {
        return false
      }

      return {nextBlock}
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
