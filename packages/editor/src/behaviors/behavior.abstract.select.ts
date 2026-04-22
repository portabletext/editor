import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getNode} from '../node-traversal/get-node'
import {getSibling} from '../node-traversal/get-sibling'
import {getBlock, isBlock} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

function getFocusedBlockPath(snapshot: EditorSnapshot): Path | undefined {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const focusPath = selection.focus.path

  if (isBlock(snapshot.context, focusPath)) {
    return getNode(snapshot.context, focusPath)?.path
  }

  // `getAncestors` returns nearest ancestor first — we want the deepest
  // ancestor that is a block at the current container level.
  const ancestors = getAncestors(snapshot.context, focusPath)

  for (const ancestor of ancestors) {
    if (isBlock(snapshot.context, ancestor.path)) {
      return ancestor.path
    }
  }

  return undefined
}

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
      const focusBlockPath = getFocusedBlockPath(snapshot)

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
      const focusBlockPath = getFocusedBlockPath(snapshot)

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
