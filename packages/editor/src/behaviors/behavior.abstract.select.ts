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
          ? getBlockEndPoint(previousBlock)
          : getBlockStartPoint(previousBlock)

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
          selection,
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
          ? getBlockEndPoint(nextBlock)
          : getBlockStartPoint(nextBlock)

      return {selection: {anchor: point, focus: point}}
    },
    actions: [
      (_, {selection}) => [
        raise({
          type: 'select',
          selection,
        }),
      ],
    ],
  }),
]
