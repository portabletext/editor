import {isElement} from '../element/is-element'
import type {Operation, Path} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {getNodes} from '../node/get-nodes'
import {hasNode} from '../node/has-node'
import {isNormalizing} from './is-normalizing'
import {node} from './node'
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
    const key = path.join(',')
    getDirtyPathKeys(editor).delete(key)
    return path
  }

  if (!isNormalizing(editor)) {
    return
  }

  if (force) {
    const allPaths = Array.from(getNodes(editor, editor.schema), ([, p]) => p)
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
      if (hasNode(editor, dirtyPath, editor.schema)) {
        const entry = node(editor, dirtyPath)
        const [entryNode, _] = entry

        /*
          The default normalizer inserts an empty text node in this scenario, but it can be customised.
          So there is some risk here.

          As long as the normalizer only inserts child nodes for this case it is safe to do in any order;
          by definition adding children to an empty node can't cause other paths to change.
        */
        if (
          isElement(entryNode, editor.schema) &&
          entryNode.children.length === 0
        ) {
          editor.normalizeNode(entry, {operation})
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
      if (hasNode(editor, dirtyPath, editor.schema)) {
        const entry = node(editor, dirtyPath)
        editor.normalizeNode(entry, {operation})
      }
      iteration++
      dirtyPaths = getDirtyPaths(editor)
    }
  })
}
