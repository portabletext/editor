import {isSpan} from '@portabletext/schema'
import {applySplitNode} from '../../internal-utils/apply-split-node'
import {getAncestorObjectNode} from '../../node-traversal/get-ancestor-object-node'
import {getNode} from '../../node-traversal/get-node'
import {getNodeDescendants, getNodes} from '../../node-traversal/get-nodes'
import {end as editorEnd} from '../editor/end'
import {isEdge} from '../editor/is-edge'
import {isEnd} from '../editor/is-end'
import {path as editorPath} from '../editor/path'
import {pathRef} from '../editor/path-ref'
import {pointRef} from '../editor/point-ref'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node} from '../interfaces/node'
import type {InsertNodeOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Point} from '../interfaces/point'
import type {PointRef} from '../interfaces/point-ref'
import {isObjectNode} from '../node/is-object-node'
import {isTextBlockNode} from '../node/is-text-block-node'
import {comparePaths} from '../path/compare-paths'
import {nextPath} from '../path/next-path'
import {operationCanTransformPath} from '../path/operation-can-transform-path'
import {parentPath} from '../path/parent-path'
import {pathLevels} from '../path/path-levels'
import {previousPath} from '../path/previous-path'
import {transformPath} from '../path/transform-path'
import {isPoint} from '../point/is-point'
import {isCollapsedRange} from '../range/is-collapsed-range'
import {isRange} from '../range/is-range'
import {rangeEdges} from '../range/range-edges'
import type {RangeMode} from '../types/types'
import {getDefaultInsertLocation} from '../utils/get-default-insert-location'
import {batchDirtyPaths} from './batch-dirty-paths'
import {deleteText} from './delete-text'
import {updateDirtyPaths} from './update-dirty-paths'

interface InsertNodesOptions<T extends Node> {
  at?: Location
  match?: NodeMatch<T>
  mode?: RangeMode
  hanging?: boolean
  select?: boolean
  includeObjectNodes?: boolean
  batchDirty?: boolean
}

export function insertNodes<T extends Node>(
  editor: Editor,
  nodes: Array<Node>,
  options: InsertNodesOptions<T> = {},
): void {
  withoutNormalizing(editor, () => {
    const {
      hanging = false,
      includeObjectNodes = false,
      mode = 'lowest',
      batchDirty = true,
    } = options
    let {at, match, select} = options

    if (nodes.length === 0) {
      return
    }

    const node = nodes[0]!

    if (!at) {
      at = getDefaultInsertLocation(editor)
      if (select !== false) {
        select = true
      }
    }

    if (select == null) {
      select = false
    }

    if (isRange(at)) {
      if (!hanging) {
        at = unhangRange(editor, at)
      }

      if (isCollapsedRange(at)) {
        at = at.anchor
      } else {
        const [, end] = rangeEdges(at)
        const endPointRef = pointRef(editor, end)
        deleteText(editor, {at})
        at = endPointRef.unref()!
      }
    }

    if (isPoint(at)) {
      if (match == null) {
        if (isSpan({schema: editor.schema}, node)) {
          match = (n) => isSpan({schema: editor.schema}, n)
        } else if (editor.isInline(node)) {
          match = (n) =>
            isSpan({schema: editor.schema}, n) || editor.isInline(n)
        } else {
          match = (n) => isTextBlockNode({schema: editor.schema}, n)
        }
      }

      const entry = firstNodeWithMode(editor, {
        from: editorPath(editor, at.path, {edge: 'start'}),
        to: editorPath(editor, at.path, {edge: 'end'}),
        match: match!,
        mode,
      })

      if (entry) {
        const matchPath = entry.path
        const matchPathRef = pathRef(editor, matchPath)
        const isAtEnd = isEnd(editor, at, matchPath)

        {
          const splitAt = at as Point
          const beforeRef = pointRef(editor, splitAt, {
            affinity: 'backward',
          })
          let afterRef: PointRef | undefined
          try {
            const highest = firstNodeWithMode(editor, {
              from: splitAt.path,
              to: splitAt.path,
              match: match!,
              mode,
            })

            if (highest) {
              afterRef = pointRef(editor, splitAt)
              const depth = splitAt.path.length
              const highestPath = highest.path
              const lowestPath = splitAt.path.slice(0, depth)
              let position = splitAt.offset

              const levelEntries = pathLevels(lowestPath)
                .filter((levelPath) => levelPath.length > 0)
                .map((levelPath) => getNode(editor, levelPath))
                .filter(
                  (entry): entry is {node: Node; path: Array<number>} =>
                    entry !== undefined,
                )
                .reverse()

              for (const {path: nodePath} of levelEntries) {
                let split = false

                if (
                  nodePath.length < highestPath.length ||
                  nodePath.length === 0
                ) {
                  break
                }

                const point = beforeRef.current!
                const isEndOfNode = isEnd(editor, point, nodePath)

                if (!isEdge(editor, point, nodePath)) {
                  split = true
                  applySplitNode(editor, nodePath, position)
                }

                position =
                  nodePath[nodePath.length - 1]! +
                  (split || isEndOfNode ? 1 : 0)
              }
            }
          } finally {
            beforeRef.unref()
            afterRef?.unref()
          }
        }

        const path = matchPathRef.unref()!
        at = isAtEnd ? nextPath(path) : path
      } else {
        return
      }
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

    at = previousPath(at)

    if (select) {
      const point = editorEnd(editor, at)

      if (point) {
        editor.select(point)
      }
    }
  })
}

function firstNodeWithMode(
  editor: Editor,
  options: {
    from: Array<number>
    to: Array<number>
    match: (node: Node, path: Array<number>) => boolean
    mode: 'highest' | 'lowest'
  },
): {node: Node; path: Array<number>} | undefined {
  const {from, to, match, mode} = options
  let hit: {node: Node; path: Array<number>} | undefined

  for (const {node, path: nodePath} of getNodes(editor, {
    from,
    to,
    match,
  })) {
    const entry = {node, path: nodePath}
    const isLower = hit && comparePaths(nodePath, hit.path) === 0

    if (mode === 'highest' && isLower) {
      continue
    }

    if (mode === 'lowest' && isLower) {
      hit = entry
      continue
    }

    const emit = mode === 'lowest' ? hit : entry

    if (emit) {
      return emit
    }

    hit = entry
  }

  return hit
}
