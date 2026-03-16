import type {PortableTextSpan} from '@portabletext/schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {Editor, Selection} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Operation} from '../interfaces/operation'
import type {Range} from '../interfaces/range'
import {getTexts} from '../node/get-texts'
import {commonPath} from '../path/common-path'
import {comparePaths} from '../path/compare-paths'
import {isSiblingPath} from '../path/is-sibling-path'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {transformPoint} from '../point/transform-point'
import {isRange} from '../range/is-range'
import {rangeEquals} from '../range/range-equals'
import {rangePoints} from '../range/range-points'
import {
  insertChildren,
  modifyChildren,
  modifyDescendant,
  modifyLeaf,
  removeChildren,
} from '../utils/modify'

export function applyOperation(editor: Editor, op: Operation): void {
  let transformSelection = false

  switch (op.type) {
    case 'insert_node': {
      const {path, node} = op

      modifyChildren(editor, parentPath(path), editor.schema, (children) => {
        const index = path[path.length - 1]!

        if (index > children.length) {
          throw new Error(
            `Cannot apply an "insert_node" operation at path [${path}] because the destination is past the end of the node.`,
          )
        }

        return insertChildren(children, index, node)
      })

      transformSelection = true
      break
    }

    case 'insert_text': {
      const {path, offset, text} = op
      if (text.length === 0) {
        break
      }

      modifyLeaf(editor, path, editor.schema, (node) => {
        const before = node.text.slice(0, offset)
        const after = node.text.slice(offset)

        return {
          ...node,
          text: before + text + after,
        }
      })

      transformSelection = true
      break
    }

    case 'remove_node': {
      const {path} = op
      const index = path[path.length - 1]!

      modifyChildren(editor, parentPath(path), editor.schema, (children) =>
        removeChildren(children, index, 1),
      )

      // Transform all the points in the value, but if the point was in the
      // node that was removed we need to update the range or remove it.
      if (editor.selection) {
        let selection: Selection = {...editor.selection}

        for (const [point, key] of rangePoints(selection)) {
          const result = transformPoint(point, op)

          if (selection != null && result != null) {
            selection[key] = result
          } else {
            let prev: NodeEntry<PortableTextSpan> | undefined
            let next: NodeEntry<PortableTextSpan> | undefined

            for (const [n, p] of getTexts(editor, editor.schema)) {
              if (comparePaths(p, path) === -1) {
                prev = [n, p]
              } else {
                next = [n, p]
                break
              }
            }

            let preferNext = false
            if (prev && next) {
              if (isSiblingPath(prev[1], path)) {
                preferNext = false
              } else if (pathEquals(next[1], path)) {
                preferNext = true
              } else {
                preferNext =
                  commonPath(prev[1], path).length <
                  commonPath(next[1], path).length
              }
            }

            if (prev && !preferNext) {
              selection![key] = {path: prev[1], offset: prev[0].text.length}
            } else if (next) {
              selection![key] = {path: next[1], offset: 0}
            } else {
              selection = null
            }
          }
        }

        if (!selection || !rangeEquals(selection, editor.selection)) {
          editor.selection = selection
        }
      }

      break
    }

    case 'remove_text': {
      const {path, offset, text} = op
      if (text.length === 0) {
        break
      }

      modifyLeaf(editor, path, editor.schema, (node) => {
        const before = node.text.slice(0, offset)
        const after = node.text.slice(offset + text.length)

        return {
          ...node,
          text: before + after,
        }
      })

      transformSelection = true
      break
    }

    case 'set_node': {
      const {path, properties, newProperties} = op

      if (path.length === 0) {
        throw new Error(`Cannot set properties on the root node!`)
      }

      modifyDescendant(editor, path, editor.schema, (node) => {
        const newNode = {...node}
        const isElement = 'children' in node && Array.isArray(node.children)

        for (const key in newProperties) {
          if (key === 'children') {
            throw new Error(`Cannot set the "${key}" property of nodes!`)
          }

          // Only skip `text` on spans (which have marks), not on ObjectNodes
          // where `text` is a user property.
          if (
            key === 'text' &&
            !isElement &&
            Array.isArray((node as Record<string, unknown>)['marks'])
          ) {
            throw new Error(`Cannot set the "${key}" property of nodes!`)
          }

          const value = newProperties[key as keyof Node]

          if (value == null) {
            delete newNode[key as keyof Node]
          } else {
            newNode[key as keyof Node] = value
          }
        }

        // properties that were previously defined, but are now missing, must be deleted
        for (const key in properties) {
          if (!newProperties.hasOwnProperty(key)) {
            delete newNode[key as keyof Node]
          }
        }

        return newNode
      })

      break
    }

    case 'set_selection': {
      const {newProperties} = op

      if (newProperties == null) {
        editor.selection = null
        break
      }

      if (editor.selection == null) {
        if (!isRange(newProperties)) {
          throw new Error(
            `Cannot apply an incomplete "set_selection" operation properties ${safeStringify(
              newProperties,
            )} when there is no current selection.`,
          )
        }

        editor.selection = {...newProperties}
        break
      }

      const selection = {...editor.selection}

      for (const key in newProperties) {
        const value = newProperties[key as keyof Range]

        if (value == null) {
          if (key === 'anchor' || key === 'focus') {
            throw new Error(`Cannot remove the "${key}" selection property`)
          }

          delete selection[key as keyof Range]
        } else {
          selection[key as keyof Range] = value
        }
      }

      editor.selection = selection

      break
    }
  }

  if (transformSelection && editor.selection) {
    const selection = {...editor.selection}

    for (const [point, key] of rangePoints(selection)) {
      selection[key] = transformPoint(point, op)!
    }

    if (!rangeEquals(selection, editor.selection)) {
      editor.selection = selection
    }
  }
}
