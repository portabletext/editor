import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'
import {modifyChildren, modifyLeaf, removeChildren} from '../utils/modify'
import {getNode} from './get-node'
import {getNodes} from './get-nodes'

export function getFragment<T extends Ancestor>(
  root: T,
  range: Range,
  schema: EditorSchema,
): T['children'] {
  const newRoot: Ancestor = {children: root.children} as Ancestor

  const [start, end] = Range.edges(range)
  const nodeEntries = getNodes(newRoot, schema, {
    reverse: true,
    pass: ([, path]) => !Range.includes(range, path),
  })

  for (const [, path] of nodeEntries) {
    if (!Range.includes(range, path)) {
      const index = path[path.length - 1]!

      modifyChildren(newRoot, Path.parent(path), schema, (children) =>
        removeChildren(children, index, 1),
      )
    }

    if (Path.equals(path, end.path)) {
      const leaf = getNode(newRoot, path, schema)

      if (Text.isText(leaf, schema)) {
        modifyLeaf(newRoot, path, schema, (node) => {
          const before = node.text.slice(0, end.offset)
          return {...node, text: before}
        })
      }
    }

    if (Path.equals(path, start.path)) {
      const leaf = getNode(newRoot, path, schema)

      if (Text.isText(leaf, schema)) {
        modifyLeaf(newRoot, path, schema, (node) => {
          const before = node.text.slice(start.offset)
          return {...node, text: before}
        })
      }
    }
  }

  return newRoot.children
}
