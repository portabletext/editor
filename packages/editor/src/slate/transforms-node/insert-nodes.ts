import {applySplitNode} from '../../internal-utils/apply-split-node'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {batchDirtyPaths} from '../core/batch-dirty-paths'
import {updateDirtyPaths} from '../core/update-dirty-paths'
import type {BaseInsertNodeOperation} from '../interfaces'
import {Editor} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Point} from '../interfaces/point'
import type {PointRef} from '../interfaces/point-ref'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import {Transforms} from '../interfaces/transforms'
import type {NodeTransforms} from '../interfaces/transforms/node'
import {getDefaultInsertLocation} from '../utils'

export const insertNodes: NodeTransforms['insertNodes'] = (
  editor,
  nodes,
  options = {},
) => {
  Editor.withoutNormalizing(editor, () => {
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
        at = Editor.unhangRange(editor, at, {voids})
      }

      if (Range.isCollapsed(at)) {
        at = at.anchor
      } else {
        const [, end] = Range.edges(editor, at)
        const pointRef = Editor.pointRef(editor, end)
        Transforms.delete(editor, {at})
        at = pointRef.unref()!
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
            Element.isElement(n, editor.schema) && Editor.isBlock(editor, n)
        }
      }

      const [entry] = Editor.nodes(editor, {
        at: at.path,
        match,
        mode,
        voids,
      })

      if (entry) {
        const [, matchPath] = entry
        const pathRef = Editor.pathRef(editor, matchPath)
        const isAtEnd = Editor.isEnd(editor, at, matchPath)

        // Inline split logic (equivalent to Transforms.splitNodes with {at, match, mode, voids})
        {
          const splitAt = at as Point
          const beforeRef = Editor.pointRef(editor, splitAt, {
            affinity: 'backward',
          })
          let afterRef: PointRef | undefined
          try {
            const [highest] = Editor.nodes(editor, {
              at: splitAt,
              match,
              mode,
              voids,
            })

            if (highest) {
              afterRef = Editor.pointRef(editor, splitAt)
              const depth = splitAt.path.length
              const [, highestPath] = highest
              const lowestPath = splitAt.path.slice(0, depth)
              let position = splitAt.offset

              for (const [node, nodePath] of Editor.levels(editor, {
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
                const isEndOfNode = Editor.isEnd(editor, point, nodePath)

                if (!Editor.isEdge(editor, point, nodePath)) {
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

        const path = pathRef.unref()!
        at = isAtEnd ? Path.next(path) : path
      } else {
        return
      }
    }

    const parentPath = Path.parent(at)
    let index = at[at.length - 1]!

    if (!voids && Editor.void(editor, {at: parentPath})) {
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
      const point = Editor.end(editor, at)

      if (point) {
        Transforms.select(editor, point)
      }
    }
  })
}
