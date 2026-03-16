import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySplitNode} from '../../internal-utils/apply-split-node'
import {end as editorEnd} from '../editor/end'
import {getObjectNode} from '../editor/get-object-node'
import {isEdge} from '../editor/is-edge'
import {isEnd} from '../editor/is-end'
import {levels} from '../editor/levels'
import {nodes as editorNodes} from '../editor/nodes'
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
import {extractProps} from '../node/extract-props'
import {getNodes} from '../node/get-nodes'
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
        at = unhangRange(editor, at, {includeObjectNodes})
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
          match = (n) => isTextBlock({schema: editor.schema}, n)
        }
      }

      const [entry] = editorNodes(editor, {
        at: at.path,
        match,
        mode,
        includeObjectNodes,
      })

      if (entry) {
        const [, matchPath] = entry
        const matchPathRef = pathRef(editor, matchPath)
        const isAtEnd = isEnd(editor, at, matchPath)

        {
          const splitAt = at as Point
          const beforeRef = pointRef(editor, splitAt, {
            affinity: 'backward',
          })
          let afterRef: PointRef | undefined
          try {
            const [highest] = editorNodes(editor, {
              at: splitAt,
              match,
              mode,
              includeObjectNodes,
            })

            if (highest) {
              afterRef = pointRef(editor, splitAt)
              const depth = splitAt.path.length
              const [, highestPath] = highest
              const lowestPath = splitAt.path.slice(0, depth)
              let position = splitAt.offset

              for (const [node, nodePath] of levels(editor, {
                at: lowestPath,
                reverse: true,
                includeObjectNodes,
              })) {
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
                  const properties = extractProps(node, editor.schema)
                  applySplitNode(editor, nodePath, position, properties)
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

    if (!includeObjectNodes && getObjectNode(editor, {at: parentPath_})) {
      return
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
            if (isSpan({schema: editor.schema}, node)) {
              newDirtyPaths.push(path)
            } else {
              newDirtyPaths.push(
                ...Array.from(getNodes(node, editor.schema), ([, p]) =>
                  path.concat(p),
                ),
              )
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
