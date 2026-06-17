import {parentPath} from '../engine/path/parent-path'
import {pathEquals} from '../engine/path/path-equals'
import {getChildrenAt} from '../traversal/get-children'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractMoveBehaviors = [
  defineBehavior({
    on: 'move.block',
    guard: ({snapshot, event}) => {
      const originEntry = getNode(snapshot, event.at)
      const destinationEntry = getNode(snapshot, event.to)

      if (!originEntry || !destinationEntry) {
        return false
      }

      // Moving a block onto its own resolved path is a no-op. Bailing here
      // avoids decomposing into an unset+insert pair where the insert's
      // keyed path no longer resolves after the unset, which the apply
      // layer would throw on and leave the source block eaten.
      if (pathEquals(originEntry.path, destinationEntry.path)) {
        return false
      }

      const siblings = getChildrenAt(snapshot, parentPath(originEntry.path))
      const originIndex = siblings.findIndex(
        (sibling) => sibling.node._key === originEntry.node._key,
      )
      const destinationIndex = siblings.findIndex(
        (sibling) => sibling.node._key === destinationEntry.node._key,
      )
      // Direction is meaningful only when origin and destination share a
      // parent. For cross-container moves `destinationIndex` is -1, falling
      // back to `position: 'before'`, which inserts the block immediately
      // before the destination inside its container.
      const movingDown =
        originIndex !== -1 &&
        destinationIndex !== -1 &&
        originIndex < destinationIndex

      return {
        originEntry,
        destinationEntry,
        movingDown,
      }
    },
    actions: [
      (_, {originEntry, destinationEntry, movingDown}) => [
        raise({type: 'unset', at: originEntry.path}),
        raise({
          type: 'insert',
          at: destinationEntry.path,
          value: originEntry.node,
          position: movingDown ? 'after' : 'before',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'move.block up',
    guard: ({snapshot, event}) => {
      const previousSibling = getSibling(snapshot, event.at, {
        direction: 'previous',
      })

      if (previousSibling) {
        return {
          previousSibling,
          savedSelection: snapshot.context.selection,
        }
      }

      return false
    },
    actions: [
      ({event}, {previousSibling, savedSelection}) => {
        const actions = [
          raise({
            type: 'move.block',
            at: event.at,
            to: previousSibling.path,
          }),
        ]

        if (savedSelection) {
          actions.push(raise({type: 'select', at: savedSelection}))
        }

        return actions
      },
    ],
  }),
  defineBehavior({
    on: 'move.block down',
    guard: ({snapshot, event}) => {
      const nextSibling = getSibling(snapshot, event.at, {direction: 'next'})

      if (nextSibling) {
        return {
          nextSibling,
          savedSelection: snapshot.context.selection,
        }
      }

      return false
    },
    actions: [
      ({event}, {nextSibling, savedSelection}) => {
        const actions = [
          raise({
            type: 'move.block',
            at: event.at,
            to: nextSibling.path,
          }),
        ]

        if (savedSelection) {
          actions.push(raise({type: 'select', at: savedSelection}))
        }

        return actions
      },
    ],
  }),
]
