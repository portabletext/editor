import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor} from '../interfaces/node'
import type {Range} from '../interfaces/range'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {rangeEdges} from '../range/range-edges'
import {rangeIncludes} from '../range/range-includes'
import {isText} from '../text/is-text'
import {modifyChildren, modifyLeaf, removeChildren} from '../utils/modify'
import {getNode} from './get-node'
import {getNodes} from './get-nodes'

export function getFragment<T extends Ancestor>(
  root: T,
  range: Range,
  schema: EditorSchema,
): T['children'] {
  const newRoot: Ancestor = {children: root.children} as Ancestor

  const [start, end] = rangeEdges(range)
  const nodeEntries = getNodes(newRoot, schema, {
    reverse: true,
    pass: ([, path]) => !rangeIncludes(range, path),
  })

  for (const [, path] of nodeEntries) {
    if (!rangeIncludes(range, path)) {
      const index = path[path.length - 1]!

      modifyChildren(newRoot, parentPath(path), schema, (children) =>
        removeChildren(children, index, 1),
      )
    }

    if (pathEquals(path, end.path)) {
      const leaf = getNode(newRoot, path, schema)

      if (isText(leaf, schema)) {
        modifyLeaf(newRoot, path, schema, (node) => {
          const before = node.text.slice(0, end.offset)
          return {...node, text: before}
        })
      }
    }

    if (pathEquals(path, start.path)) {
      const leaf = getNode(newRoot, path, schema)

      if (isText(leaf, schema)) {
        modifyLeaf(newRoot, path, schema, (node) => {
          const before = node.text.slice(start.offset)
          return {...node, text: before}
        })
      }
    }
  }

  return newRoot.children
}
