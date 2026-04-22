import {getSibling} from '../node-traversal/get-sibling'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractMoveBehaviors = [
  defineBehavior({
    on: 'move.block up',
    guard: ({snapshot, event}) => {
      const previousSibling = getSibling(snapshot.context, event.at, 'previous')

      if (previousSibling) {
        return {previousSibling}
      }

      return false
    },
    actions: [
      ({event}, {previousSibling}) => [
        raise({
          type: 'move.block',
          at: event.at,
          to: previousSibling.path,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'move.block down',
    guard: ({snapshot, event}) => {
      const nextSibling = getSibling(snapshot.context, event.at, 'next')

      if (nextSibling) {
        return {nextSibling}
      }

      return false
    },
    actions: [
      ({event}, {nextSibling}) => [
        raise({
          type: 'move.block',
          at: event.at,
          to: nextSibling.path,
        }),
      ],
    ],
  }),
]
