import {getNextBlock, getPreviousBlock} from '../selectors'
import {getBlockEndPoint, getBlockStartPoint} from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSelectBehaviors = [
  defineBehavior({
    on: 'select.previous block',
    guard: ({snapshot, event}) => {
      const previousBlock = getPreviousBlock(snapshot)

      if (!previousBlock) {
        return false
      }

      const point =
        event.select === 'end'
          ? getBlockEndPoint({
              context: snapshot.context,
              block: previousBlock,
            })
          : getBlockStartPoint({
              context: snapshot.context,
              block: previousBlock,
            })

      return {
        selection: {
          anchor: point,
          focus: point,
        },
      }
    },
    actions: [
      (_, {selection}) => [
        raise({
          type: 'select',
          at: selection,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'select.next block',
    guard: ({snapshot, event}) => {
      const nextBlock = getNextBlock(snapshot)

      if (!nextBlock) {
        return false
      }

      const point =
        event.select === 'end'
          ? getBlockEndPoint({
              context: snapshot.context,
              block: nextBlock,
            })
          : getBlockStartPoint({
              context: snapshot.context,
              block: nextBlock,
            })

      return {selection: {anchor: point, focus: point}}
    },
    actions: [
      (_, {selection}) => [
        raise({
          type: 'select',
          at: selection,
        }),
      ],
    ],
  }),
]
