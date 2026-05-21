import {safeStringify} from '../internal-utils/safe-json'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {parentPath} from '../slate/path/parent-path'
import type {OperationImplementation} from './operation.types'

export const moveBlockOperationImplementation: OperationImplementation<
  'move.block'
> = ({operation}) => {
  const editor = operation.editor
  const originEntry = getNode(editor, operation.at)

  if (!originEntry) {
    throw new Error(
      `Failed to resolve origin block at ${safeStringify(operation.at)}`,
    )
  }

  const destinationEntry = getNode(editor, operation.to)

  if (!destinationEntry) {
    throw new Error(
      `Failed to resolve destination block at ${safeStringify(operation.to)}`,
    )
  }

  // Moving a block onto its own resolved path is a no-op. Without this
  // guard the implementation unsets the source then tries to insert at
  // a path that no longer points at anything (the index has shifted by
  // one), eating the block. Consumers reaching for the raw `move.block`
  // event with caller-supplied keys can land in this shape easily; the
  // high-level `move.block up`/`down` events bail earlier when there
  // is no neighbouring sibling.
  if (originEntry.node._key === destinationEntry.node._key) {
    return
  }

  // Determine movement direction within the shared sibling array. Only
  // supports moves at the same level today (root → root or within the
  // same container field). Cross-level moves would need the behavior to
  // split the move into remove + insert with explicit parent resolution.
  const siblings = getChildren(editor, parentPath(originEntry.path))
  const originIndex = siblings.findIndex(
    (sibling) => sibling.node._key === originEntry.node._key,
  )
  const destinationIndex = siblings.findIndex(
    (sibling) => sibling.node._key === destinationEntry.node._key,
  )
  const movingDown =
    originIndex !== -1 &&
    destinationIndex !== -1 &&
    originIndex < destinationIndex

  const node = originEntry.node
  const savedSelection = editor.selection

  withoutNormalizing(editor, () => {
    editor.apply({
      type: 'unset',
      path: originEntry.path,
    })
    editor.apply({
      type: 'insert',
      path: destinationEntry.path,
      node,
      position: movingDown ? 'after' : 'before',
    })
  })

  if (savedSelection) {
    editor.selection = savedSelection
  }
}
