import {isSpan} from '@portabletext/schema'
import {getAncestorObjectNode} from '../../node-traversal/get-ancestor-object-node'
import {getNode} from '../../node-traversal/get-node'
import {getNodeDescendants} from '../../node-traversal/get-nodes'
import {path as editorPath} from '../editor/path'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {InsertNodeOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import {isObjectNode} from '../node/is-object-node'
import {nextPath} from '../path/next-path'
import {operationCanTransformPath} from '../path/operation-can-transform-path'
import {parentPath} from '../path/parent-path'
import {pathLevels} from '../path/path-levels'
import {transformPath} from '../path/transform-path'
import {batchDirtyPaths} from './batch-dirty-paths'
import {updateDirtyPaths} from './update-dirty-paths'

interface InsertNodesOptions {
  at: Path
  includeObjectNodes?: boolean
  batchDirty?: boolean
}

export function insertNodes(
  editor: Editor,
  nodes: Array<Node>,
  options: InsertNodesOptions,
): void {
  withoutNormalizing(editor, () => {
    const {includeObjectNodes = false, batchDirty = true} = options
    let at: Path = options.at

    if (nodes.length === 0) {
      return
    }

    const parentPath_ = parentPath(at)
    let index = at[at.length - 1]!

    if (!includeObjectNodes) {
      const parentNodePath = editorPath(editor, parentPath_)
      const parentNodeEntry = getNode(editor, parentNodePath)
      const parentObjectNode =
        parentNodeEntry &&
        isObjectNode({schema: editor.schema}, parentNodeEntry.node)
          ? parentNodeEntry
          : getAncestorObjectNode(editor, parentPath_)
      if (parentObjectNode) {
        return
      }
    }

    if (batchDirty) {
      // PERF: batch update dirty paths
      // batched ops used to transform existing dirty paths
      const batchedOps: InsertNodeOperation[] = []
      const newDirtyPaths: Path[] = pathLevels(parentPath_)
      batchDirtyPaths(
        editor,
        () => {
          for (const node of nodes) {
            const path = parentPath_.concat(index)
            index++

            const op: InsertNodeOperation = {
              type: 'insert_node',
              path,
              node,
            }
            editor.apply(op)
            at = nextPath(at as Path)

            batchedOps.push(op)

            if (!isSpan(editor, node)) {
              for (const {path: p} of getNodeDescendants(editor, node)) {
                newDirtyPaths.push(path.concat(p))
              }
            }
          }
        },
        () => {
          updateDirtyPaths(editor, newDirtyPaths, (p) => {
            let newPath: Path | null = p
            for (const op of batchedOps) {
              if (operationCanTransformPath(op)) {
                newPath = transformPath(newPath, op)
                if (!newPath) {
                  return null
                }
              }
            }
            return newPath
          })
        },
      )
    } else {
      for (const node of nodes) {
        const path = parentPath_.concat(index)
        index++

        editor.apply({type: 'insert_node', path, node})
        at = nextPath(at as Path)
      }
    }
  })
}
