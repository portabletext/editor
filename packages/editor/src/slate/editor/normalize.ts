import {isTextBlock} from '@portabletext/schema'
import {getNode} from '../../node-traversal/get-node'
import {getNodes} from '../../node-traversal/get-nodes'
import {hasNode} from '../../node-traversal/has-node'
import type {Editor} from '../interfaces/editor'
import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isNormalizing} from './is-normalizing'
import {withoutNormalizing} from './without-normalizing'

export function normalize(
  editor: Editor,
  options: {force?: boolean; operation?: Operation} = {},
): void {
  const {force = false, operation} = options
  const getDirtyPaths = (editor: Editor) => {
    return editor.dirtyPaths
  }

  const getDirtyPathKeys = (editor: Editor) => {
    return editor.dirtyPathKeys
  }

  const popDirtyPath = (editor: Editor): Path => {
    const path = getDirtyPaths(editor).pop()!
    const key =
      path.length === 1
        ? String(path[0])
        : path.length === 2
          ? `${path[0]},${path[1]}`
          : path.join(',')
    getDirtyPathKeys(editor).delete(key)
    return path
  }

  if (!isNormalizing(editor)) {
    return
  }

  if (force) {
    const allPaths = Array.from(getNodes(editor), (entry) => entry.path)
    const allPathKeys = new Set(allPaths.map((p) => p.join(',')))
    editor.dirtyPaths = allPaths
    editor.dirtyPathKeys = allPathKeys
  }

  if (getDirtyPaths(editor).length === 0) {
    return
  }

  withoutNormalizing(editor, () => {
    /*
      Fix dirty elements with no children.
      editor.normalizeNode() does fix this, but some normalization fixes also require it to work.
      Running an initial pass avoids the catch-22 race condition.
    */
    for (const dirtyPath of getDirtyPaths(editor)) {
      if (dirtyPath.length === 0) {
        continue
      }

      if (hasNode(editor, dirtyPath)) {
        const entry = getNode(editor, dirtyPath)
        if (!entry) {
          continue
        }
        const entryNode = entry.node

        /*
          The default normalizer inserts an empty text node in this scenario, but it can be customised.
          So there is some risk here.

          As long as the normalizer only inserts child nodes for this case it is safe to do in any order;
          by definition adding children to an empty node can't cause other paths to change.
        */
        if (
          isTextBlock({schema: editor.schema}, entryNode) &&
          entryNode.children.length === 0
        ) {
          editor.isNormalizingNode = true
          editor.normalizeNode([entry.node, entry.path], {operation})
          editor.isNormalizingNode = false
        }
      }
    }

    let dirtyPaths = getDirtyPaths(editor)
    const initialDirtyPathsLength = dirtyPaths.length
    let iteration = 0

    while (dirtyPaths.length !== 0) {
      if (
        !editor.shouldNormalize({
          dirtyPaths,
          iteration,
          initialDirtyPathsLength,
          operation,
        })
      ) {
        return
      }

      const dirtyPath = popDirtyPath(editor)

      // If the node doesn't exist in the tree, it does not need to be normalized.
      if (dirtyPath.length === 0) {
        editor.isNormalizingNode = true
        editor.normalizeNode([editor, dirtyPath], {operation})
        editor.isNormalizingNode = false
      } else if (hasNode(editor, dirtyPath)) {
        const entry = getNode(editor, dirtyPath)
        if (entry) {
          editor.isNormalizingNode = true
          editor.normalizeNode([entry.node, entry.path], {operation})
          editor.isNormalizingNode = false
        }
      }
      iteration++
      dirtyPaths = getDirtyPaths(editor)
    }
  })
}
