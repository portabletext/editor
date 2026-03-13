import {applySplitNode} from '../../internal-utils/apply-split-node'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {end as editorEnd} from '../editor/end'
import {getVoid} from '../editor/get-void'
import {isBlock} from '../editor/is-block'
import {isEdge} from '../editor/is-edge'
import {isEnd} from '../editor/is-end'
import {levels} from '../editor/levels'
import {nodes as editorNodes} from '../editor/nodes'
import {pathRef} from '../editor/path-ref'
import {pointRef} from '../editor/point-ref'
import {unhangRange} from '../editor/unhang-range'
import {withoutNormalizing} from '../editor/without-normalizing'
import type {BaseInsertNodeOperation, Location} from '../interfaces'
import {Editor, type NodeMatch} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Point} from '../interfaces/point'
import type {PointRef} from '../interfaces/point-ref'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import type {RangeMode} from '../types/types'
import {getDefaultInsertLocation} from '../utils'
import {batchDirtyPaths} from './batch-dirty-paths'
import {updateDirtyPaths} from './update-dirty-paths'

export interface InsertNodesOptions<T extends Node> {
  at?: Location
  match?: NodeMatch<T>
  mode?: RangeMode
  hanging?: boolean
  select?: boolean
  voids?: boolean
  batchDirty?: boolean
}

export function insertNodes<T extends Node>(
  editor: Editor,
  nodes: Node | Node[],
  options: InsertNodesOptions<T> = {},
): void {
  withoutNormalizing(editor, () => {
    const {
      hanging = false,
      voids = false,
      mode = 'lowest',
      batchDirty = true,
    } = options
    let {at, match, select} = options

    if (Node.isNode(nodes, editor.schema)) {
      nodes = [nodes]
    }

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

    if (Range.isRange(at)) {
      if (!hanging) {
        at = unhangRange(editor, at, {voids})
      }

      if (Range.isCollapsed(at)) {
        at = at.anchor
      } else {
        const [, end] = Range.edges(at)
        const endPointRef = pointRef(editor, end)
        editor.delete({at})
        at = endPointRef.unref()!
      }
    }

    if (Point.isPoint(at)) {
      if (match == null) {
        if (Text.isText(node, editor.schema)) {
          match = (n) => Text.isText(n, editor.schema)
        } else if (editor.isInline(node)) {
          match = (n) =>
            Text.isText(n, editor.schema) || Editor.isInline(editor, n)
        } else {
          match = (n) =>
            Element.isElement(n, editor.schema) && isBlock(editor, n)
        }
      }

      const [entry] = editorNodes(editor, {
        at: at.path,
        match,
        mode,
        voids,
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
              voids,
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
                voids,
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
                  const properties = Node.extractProps(node, editor.schema)
                  applySplitNode(
                    editor as unknown as PortableTextSlateEditor,
                    nodePath,
                    position,
                    properties,
                  )
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
        at = isAtEnd ? Path.next(path) : path
      } else {
        return
      }
    }

    const parentPath = Path.parent(at)
    let index = at[at.length - 1]!

    if (!voids && getVoid(editor, {at: parentPath})) {
      return
    }

    if (batchDirty) {
      // PERF: batch update dirty paths
      // batched ops used to transform existing dirty paths
      const batchedOps: BaseInsertNodeOperation[] = []
      const newDirtyPaths: Path[] = Path.levels(parentPath)
      batchDirtyPaths(
        editor,
        () => {
          for (const node of nodes as Node[]) {
            const path = parentPath.concat(index)
            index++

            const op: BaseInsertNodeOperation = {
              type: 'insert_node',
              path,
              node,
            }
            editor.apply(op)
            at = Path.next(at as Path)

            batchedOps.push(op)
            if (Text.isText(node, editor.schema)) {
              newDirtyPaths.push(path)
            } else {
              newDirtyPaths.push(
                ...Array.from(Node.nodes(node, editor.schema), ([, p]) =>
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
              if (Path.operationCanTransformPath(op)) {
                newPath = Path.transform(newPath, op)
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
      for (const node of nodes as Node[]) {
        const path = parentPath.concat(index)
        index++

        editor.apply({type: 'insert_node', path, node})
        at = Path.next(at as Path)
      }
    }

    at = Path.previous(at)

    if (select) {
      const point = editorEnd(editor, at)

      if (point) {
        editor.select(point)
      }
    }
  })
}
