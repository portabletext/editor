import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import {safeStringify} from '../../internal-utils/safe-json'
import {getNodes} from '../../node-traversal/get-nodes'
import type {EditorSelection} from '../../types/editor'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Operation} from '../interfaces/operation'
import type {Range} from '../interfaces/range'
import {commonPath} from '../path/common-path'
import {comparePaths} from '../path/compare-paths'
import {isSiblingPath} from '../path/is-sibling-path'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {transformPoint} from '../point/transform-point'
import {isBackwardRange} from '../range/is-backward-range'
import {isRange} from '../range/is-range'
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
      const {path} = op
      let {node} = op

      const isRootInsert = parentPath(path).length === 0
      let insertIndex = -1

      modifyChildren(editor, parentPath(path), editor.schema, (children) => {
        // Ensure unique keys on inserted nodes (skip during remote/undo/redo)
        if (
          !editor.isProcessingRemoteChanges &&
          !editor.isUndoing &&
          !editor.isRedoing &&
          node._key !== undefined &&
          children.some((sibling) => sibling._key === node._key)
        ) {
          node = {...node, _key: editor.keyGenerator()}
          op.node = node
        }

        const lastSegment = path[path.length - 1]!
        let index: number

        if (isKeyedSegment(lastSegment)) {
          const siblingIndex = resolveChildIndex(
            children,
            lastSegment._key,
            isRootInsert ? editor.blockIndexMap : undefined,
          )
          if (siblingIndex === -1) {
            throw new Error(
              `Cannot apply an "insert_node" operation at path [${path}] because the sibling was not found.`,
            )
          }
          index = op.position === 'after' ? siblingIndex + 1 : siblingIndex
        } else if (typeof lastSegment === 'number') {
          index = lastSegment
        } else {
          throw new Error(
            `Cannot apply an "insert_node" operation at path [${path}] because the last segment is a field name.`,
          )
        }

        if (index > children.length) {
          throw new Error(
            `Cannot apply an "insert_node" operation at path [${path}] because the destination is past the end of the node.`,
          )
        }

        insertIndex = index
        return insertChildren(children, index, node)
      })

      if (isRootInsert && insertIndex !== -1) {
        if (insertIndex < editor.blockIndexMap.size) {
          for (const [key, idx] of editor.blockIndexMap) {
            if (idx >= insertIndex) {
              editor.blockIndexMap.set(key, idx + 1)
            }
          }
        }
        editor.blockIndexMap.set(node._key, insertIndex)
      }

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
      const lastSegment = path[path.length - 1]!

      // Transform the selection BEFORE removing the node from the tree.
      // comparePaths needs the node in the tree to resolve document order
      // for keyed segments. After removal, it falls back to string
      // comparison of _key values which may give wrong ordering.
      if (editor.selection) {
        let selection: EditorSelection = {...editor.selection}

        for (const [point, key] of rangePoints(selection)) {
          const result = transformPoint(point, op)

          if (selection != null && result != null) {
            selection[key] = result
          } else {
            let prev: NodeEntry<PortableTextSpan> | undefined
            let next: NodeEntry<PortableTextSpan> | undefined

            for (const {node: n, path: p} of getNodes(editor)) {
              if (!isSpan({schema: editor.schema}, n)) {
                continue
              }
              if (pathEquals(p, path)) {
                continue
              }
              if (comparePaths(p, path, editor) === -1) {
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

        editor.selection = selection
          ? {...selection, backward: isBackwardRange(selection, editor)}
          : null
      }

      const isRootRemove = parentPath(path).length === 0
      let removeIndex = -1

      modifyChildren(editor, parentPath(path), editor.schema, (children) => {
        let index: number

        if (isKeyedSegment(lastSegment)) {
          index = resolveChildIndex(
            children,
            lastSegment._key,
            isRootRemove ? editor.blockIndexMap : undefined,
          )
          if (index === -1) {
            throw new Error(
              `Cannot apply a "remove_node" operation at path [${path}] because the node was not found.`,
            )
          }
        } else if (typeof lastSegment === 'number') {
          index = lastSegment
        } else {
          throw new Error(
            `Cannot apply a "remove_node" operation at path [${path}] because the last segment is a field name.`,
          )
        }

        const previousSibling = index > 0 ? children[index - 1] : undefined
        op.previousSiblingKey = previousSibling?._key

        removeIndex = index
        return removeChildren(children, index, 1)
      })

      if (isRootRemove && isKeyedSegment(lastSegment) && removeIndex !== -1) {
        editor.blockIndexMap.delete(lastSegment._key)
        for (const [key, idx] of editor.blockIndexMap) {
          if (idx > removeIndex) {
            editor.blockIndexMap.set(key, idx - 1)
          }
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

        for (const key in newProperties) {
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

      if (
        path.length === 1 &&
        '_key' in newProperties &&
        newProperties._key !== properties._key
      ) {
        const oldKey = properties._key
        const newKey = newProperties._key
        if (typeof oldKey === 'string' && typeof newKey === 'string') {
          const index = editor.blockIndexMap.get(oldKey)
          if (index !== undefined) {
            editor.blockIndexMap.delete(oldKey)
            editor.blockIndexMap.set(newKey, index)
          }
        }
      }

      transformSelection = true
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

        editor.selection = {
          ...newProperties,
          backward: isBackwardRange(newProperties, editor),
        }
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

      editor.selection = {
        ...selection,
        backward: isBackwardRange(selection, editor),
      }

      break
    }
  }

  if (transformSelection && editor.selection) {
    const selection = {...editor.selection}

    for (const [point, key] of rangePoints(selection)) {
      selection[key] = transformPoint(point, op)!
    }

    editor.selection = {
      ...selection,
      backward: isBackwardRange(selection, editor),
    }
  }
}

/**
 * Resolve a child index by key, using blockIndexMap for O(1) lookup when available.
 * Falls back to linear scan when the map is unavailable or stale.
 */
function resolveChildIndex(
  children: Array<Node>,
  key: string,
  blockIndexMap: Map<string, number> | undefined,
): number {
  if (blockIndexMap && blockIndexMap.size === children.length) {
    const index = blockIndexMap.get(key)
    if (index !== undefined) {
      const candidate = children[index]
      if (candidate && candidate._key === key) {
        return index
      }
    }
  }
  return children.findIndex((child) => child._key === key)
}
