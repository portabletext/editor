import {
  applyAll,
  set as setPatchHelper,
  unset as unsetPatchHelper,
} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import {getValue} from '../../internal-utils/get-value'
import {safeStringify} from '../../internal-utils/safe-json'
import {getNode} from '../../traversal/get-node'
import {getNodes} from '../../traversal/get-nodes'
import type {EditorSelection} from '../../types/editor'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
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
    case 'insert': {
      const {path} = op
      let {node} = op

      const isRootInsert = parentPath(path).length === 0
      let insertIndex = -1

      modifyChildren(editor, parentPath(path), (children) => {
        // Ensure unique keys on inserted nodes (skip during remote/undo/redo)
        if (
          !editor.isProcessingRemoteChanges &&
          !editor.isUndoing &&
          !editor.isRedoing &&
          node._key !== undefined &&
          children.some((sibling) => sibling._key === node._key)
        ) {
          node = {...node, _key: editor.snapshot.context.keyGenerator()}
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
              `Cannot apply an "insert" operation at path [${path}] because the sibling was not found.`,
            )
          }
          index = op.position === 'after' ? siblingIndex + 1 : siblingIndex
        } else if (typeof lastSegment === 'number') {
          index = op.position === 'after' ? lastSegment + 1 : lastSegment
        } else {
          throw new Error(
            `Cannot apply an "insert" operation at path [${path}] because the last segment is a field name.`,
          )
        }

        if (index > children.length) {
          throw new Error(
            `Cannot apply an "insert" operation at path [${path}] because the destination is past the end of the node.`,
          )
        }

        if (!op.inverse && !editor.isProcessingRemoteChanges) {
          op.inverse = {
            type: 'unset',
            path:
              node._key !== undefined
                ? replaceLastSegment(path, {_key: node._key})
                : path,
          }
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

      modifyLeaf(editor, path, (node) => {
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

    case 'remove_text': {
      const {path, offset, text} = op
      if (text.length === 0) {
        break
      }

      modifyLeaf(editor, path, (node) => {
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

    case 'set': {
      const {path, value} = op

      if (!op.inverse && !editor.isProcessingRemoteChanges) {
        const previousValue = getValue(editor.snapshot.context.value, path)
        op.inverse =
          previousValue === undefined
            ? {type: 'unset', path}
            : {type: 'set', path, value: previousValue}
      }

      // Root-level value replacement: set editor.snapshot.context.value directly
      if (path.length === 0) {
        if (Array.isArray(value)) {
          editor.snapshot.context.value =
            value as unknown as PortableTextBlock[]
          // Rebuild blockIndexMap
          editor.blockIndexMap.clear()
          for (let i = 0; i < editor.snapshot.context.value.length; i++) {
            const child = editor.snapshot.context.value[i]
            if (child) {
              editor.blockIndexMap.set(child._key, i)
            }
          }
        }
        transformSelection = true
        break
      }

      // Split path into node path (up to last keyed/numeric segment)
      // and property path (trailing string segments)
      const {nodePath: setNodePath, propertyPath: setPropertyPath} =
        splitNodeAndPropertyPath(path)

      if (setNodePath.length === 0) {
        break
      }

      if (setPropertyPath.length === 0) {
        // Full node replacement: replace the node at setNodePath with value
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          modifyDescendant(editor, setNodePath, () => {
            return value as Node
          })
        }
        transformSelection = true
        break
      }

      // Check if the node path resolves to a known node
      const setNodeEntry = getNode(editor.snapshot, setNodePath)

      if (setNodeEntry) {
        // Node found: use modifyDescendant
        if (setPropertyPath.length === 1) {
          const propertyName = setPropertyPath[0]!
          modifyDescendant(editor, setNodePath, (node) => {
            return {...node, [propertyName]: value} as typeof node
          })

          // Update blockIndexMap when _key changes on a root-level block.
          // The preamble above guarantees op.inverse is populated; if it's a
          // 'set' (existing key being renamed), the surgical delete+set keeps
          // the map consistent. A 'unset' inverse means the node didn't have
          // a _key before — no map entry to migrate, nothing to do.
          if (
            propertyName === '_key' &&
            setNodePath.length === 1 &&
            op.inverse?.type === 'set' &&
            typeof op.inverse.value === 'string' &&
            typeof value === 'string'
          ) {
            const blockIndex = editor.blockIndexMap.get(op.inverse.value)
            if (blockIndex !== undefined) {
              editor.blockIndexMap.delete(op.inverse.value)
              editor.blockIndexMap.set(value, blockIndex)
            }
          }
        } else {
          // Multiple property segments: deep set on the resolved node
          modifyDescendant(editor, setNodePath, (node) => {
            return deepSet(node, setPropertyPath, value)
          })
        }
      } else {
        // Node not found (e.g., markDefs path): apply on the root block
        const blockKey = findBlockKey(path)
        if (!blockKey) {
          break
        }

        const blockIndex = resolveBlockIndex(editor, blockKey)
        if (blockIndex === -1) {
          break
        }

        const block = editor.snapshot.context.value[blockIndex]
        if (!block) {
          break
        }

        const updatedBlock = applyAll(block, [
          setPatchHelper(value, path.slice(1)),
        ])

        const newChildren = editor.snapshot.context.value.slice()
        newChildren[blockIndex] = updatedBlock
        editor.snapshot.context.value = newChildren
      }

      transformSelection = true
      break
    }

    case 'unset': {
      const {path} = op

      // Root-level unset: remove all children
      if (path.length === 0) {
        if (!op.inverse && !editor.isProcessingRemoteChanges) {
          op.inverse = {
            type: 'set',
            path,
            value: editor.snapshot.context.value,
          }
        }
        editor.snapshot.context.value = []
        editor.blockIndexMap.clear()
        transformSelection = true
        break
      }

      // Node removal: last segment is a keyed or numeric reference to an
      // array member. Check this BEFORE splitting into node/property paths
      // since node removal doesn't need that split.
      const lastSegment = path[path.length - 1]
      if (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') {
        // Transform the selection BEFORE removing the node from the tree.
        // comparePaths needs the node in the tree to resolve document order
        // for keyed segments. After removal, it falls back to string
        // comparison of _key values which may give wrong ordering.
        if (editor.snapshot.context.selection) {
          let selection: EditorSelection = {
            ...editor.snapshot.context.selection,
          }

          for (const [point, key] of rangePoints(selection)) {
            const result = transformPoint(point, op)

            if (selection != null && result != null) {
              selection[key] = result
            } else {
              let prev: NodeEntry<PortableTextSpan> | undefined
              let next: NodeEntry<PortableTextSpan> | undefined

              for (const {node: n, path: p} of getNodes(editor.snapshot)) {
                if (!isSpan({schema: editor.snapshot.context.schema}, n)) {
                  continue
                }
                if (pathEquals(p, path)) {
                  continue
                }
                if (comparePaths(p, path, editor.snapshot.context) === -1) {
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

          editor.snapshot.context.selection = selection
            ? {
                ...selection,
                backward: isBackwardRange(selection, editor.snapshot.context),
              }
            : null
        }

        const isRootRemove = parentPath(path).length === 0
        let removeIndex = -1
        let removedKey: string | undefined

        modifyChildren(editor, parentPath(path), (children) => {
          let index: number

          if (isKeyedSegment(lastSegment)) {
            index = resolveChildIndex(
              children,
              lastSegment._key,
              isRootRemove ? editor.blockIndexMap : undefined,
            )
          } else {
            index = lastSegment
          }

          if (index === -1 || index >= children.length) {
            throw new Error(
              `Cannot apply an "unset" (node removal) operation at path [${path}] because the node was not found.`,
            )
          }

          if (!op.inverse && !editor.isProcessingRemoteChanges) {
            const previousSibling = index > 0 ? children[index - 1] : undefined
            if (previousSibling?._key) {
              op.inverse = {
                type: 'insert',
                path: [...path.slice(0, -1), {_key: previousSibling._key}],
                node: children[index]!,
                position: 'after',
              }
            } else {
              op.inverse = {
                type: 'insert',
                path: [...path.slice(0, -1), 0],
                node: children[index]!,
                position: 'before',
              }
            }
          }

          removedKey = children[index]?._key
          removeIndex = index
          return removeChildren(children, index, 1)
        })

        if (isRootRemove && removeIndex !== -1 && removedKey) {
          editor.blockIndexMap.delete(removedKey)
          for (const [key, idx] of editor.blockIndexMap) {
            if (idx > removeIndex) {
              editor.blockIndexMap.set(key, idx - 1)
            }
          }
        }

        break
      }

      // Property removal: split path into node path and property path
      const {nodePath: unsetNodePath, propertyPath: unsetPropertyPath} =
        splitNodeAndPropertyPath(path)

      if (unsetPropertyPath.length === 0 || unsetNodePath.length === 0) {
        break
      }

      if (!op.inverse && !editor.isProcessingRemoteChanges) {
        const previousValue = getValue(editor.snapshot.context.value, path)
        if (previousValue === undefined) {
          break
        }
        op.inverse = {type: 'set', path, value: previousValue}
      }

      // Check if the node path resolves to a known node
      const unsetNodeEntry = getNode(editor.snapshot, unsetNodePath)

      if (unsetNodeEntry) {
        // Node found: use modifyDescendant
        if (unsetPropertyPath.length === 1) {
          const propertyName = unsetPropertyPath[0]!
          modifyDescendant(editor, unsetNodePath, (node) => {
            const newNode = {...node}
            delete (newNode as Record<string, unknown>)[propertyName]
            return newNode
          })
        } else {
          // Multiple property segments: deep unset on the resolved node
          modifyDescendant(editor, unsetNodePath, (node) => {
            return deepUnset(node, unsetPropertyPath)
          })
        }
      } else {
        // Node not found (e.g., markDefs path): apply on the root block
        const blockKey = findBlockKey(path)
        if (!blockKey) {
          break
        }

        const blockIndex = resolveBlockIndex(editor, blockKey)
        if (blockIndex === -1) {
          break
        }

        const block = editor.snapshot.context.value[blockIndex]
        if (!block) {
          break
        }

        const updatedBlock = applyAll(block, [unsetPatchHelper(path.slice(1))])

        const newChildren = editor.snapshot.context.value.slice()
        newChildren[blockIndex] = updatedBlock
        editor.snapshot.context.value = newChildren
      }

      transformSelection = true
      break
    }

    case 'set_selection': {
      const {newProperties} = op

      if (newProperties == null) {
        editor.snapshot.context.selection = null
        break
      }

      if (editor.snapshot.context.selection == null) {
        if (!isRange(newProperties)) {
          throw new Error(
            `Cannot apply an incomplete "set_selection" operation properties ${safeStringify(
              newProperties,
            )} when there is no current selection.`,
          )
        }

        editor.snapshot.context.selection = {
          ...newProperties,
          backward: isBackwardRange(newProperties, editor.snapshot.context),
        }
        break
      }

      const selection = {...editor.snapshot.context.selection}

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

      editor.snapshot.context.selection = {
        ...selection,
        backward: isBackwardRange(selection, editor.snapshot.context),
      }

      break
    }
  }

  if (transformSelection && editor.snapshot.context.selection) {
    const anchor = transformPoint(editor.snapshot.context.selection.anchor, op)
    const focus = transformPoint(editor.snapshot.context.selection.focus, op)

    if (!anchor || !focus) {
      // The operation removed the host node of one of the selection's
      // endpoints. The selection is no longer valid.
      editor.snapshot.context.selection = null
    } else if (
      anchor !== editor.snapshot.context.selection.anchor ||
      focus !== editor.snapshot.context.selection.focus
    ) {
      // `transformPoint` returns the same reference when the operation doesn't
      // move the point. If neither endpoint moved, the selection is identity-
      // stable and we leave `editor.snapshot.context.selection` alone. This lets internal sync
      // paths (e.g. remote patches arriving via `update value`) run set/unset/
      // insert_text operations without forcing downstream consumers to re-derive
      // selection-keyed state for no semantic reason.
      editor.snapshot.context.selection = {
        anchor,
        focus,
        backward: isBackwardRange({anchor, focus}, editor.snapshot.context),
      }
    }
  }
}

/**
 * Replace the last segment in a path.
 */
function replaceLastSegment(path: Path, segment: Path[number]): Path {
  if (path.length === 0) {
    return [segment]
  }
  const result = [...path]
  result[result.length - 1] = segment
  return result
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

/**
 * Extract the block key from the first segment of a path.
 */
function findBlockKey(path: Path): string | undefined {
  const firstSegment = path[0]
  if (isKeyedSegment(firstSegment)) {
    return firstSegment._key
  }
  return undefined
}

/**
 * Resolve a block index by key, using blockIndexMap for O(1) lookup.
 */
function resolveBlockIndex(editor: Editor, blockKey: string): number {
  const mapIndex = editor.blockIndexMap.get(blockKey)
  if (mapIndex !== undefined) {
    return mapIndex
  }
  return editor.snapshot.context.value.findIndex(
    (child) => child._key === blockKey,
  )
}

/**
 * Split a path into the node path (up to and including the last
 * keyed/numeric segment) and the property path (trailing string segments).
 */
function splitNodeAndPropertyPath(path: Path): {
  nodePath: Path
  propertyPath: string[]
} {
  let lastKeyedOrNumericIndex = -1

  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i]
    if (isKeyedSegment(segment) || typeof segment === 'number') {
      lastKeyedOrNumericIndex = i
      break
    }
  }

  if (lastKeyedOrNumericIndex === -1) {
    return {
      nodePath: [],
      propertyPath: path.filter(
        (segment): segment is string => typeof segment === 'string',
      ),
    }
  }

  const nodePath = path.slice(0, lastKeyedOrNumericIndex + 1)
  const propertyPath = path
    .slice(lastKeyedOrNumericIndex + 1)
    .filter((segment): segment is string => typeof segment === 'string')

  return {nodePath, propertyPath}
}

/**
 * Deep set a value at a property path on a node.
 * Returns a new node with the value set at the nested path.
 */
function deepSet<N extends Node>(
  node: N,
  propertyPath: string[],
  value: unknown,
): N {
  if (propertyPath.length === 0) {
    return node
  }

  if (propertyPath.length === 1) {
    return {...node, [propertyPath[0]!]: value}
  }

  const [head, ...tail] = propertyPath
  const currentValue = (node as Record<string, unknown>)[head!]
  const nested =
    currentValue !== null && typeof currentValue === 'object'
      ? currentValue
      : {}

  return {
    ...node,
    [head!]: deepSetObject(nested as Record<string, unknown>, tail, value),
  }
}

/**
 * Deep set a value at a property path on a plain object.
 */
function deepSetObject(
  object: Record<string, unknown>,
  propertyPath: string[],
  value: unknown,
): Record<string, unknown> {
  if (propertyPath.length === 0) {
    return object
  }

  if (propertyPath.length === 1) {
    return {...object, [propertyPath[0]!]: value}
  }

  const [head, ...tail] = propertyPath
  const currentValue = object[head!]
  const nested =
    currentValue !== null && typeof currentValue === 'object'
      ? currentValue
      : {}

  return {
    ...object,
    [head!]: deepSetObject(nested as Record<string, unknown>, tail, value),
  }
}

/**
 * Deep unset a value at a property path on a node.
 * Returns a new node with the value removed at the nested path.
 */
function deepUnset<N extends Node>(node: N, propertyPath: string[]): N {
  if (propertyPath.length === 0) {
    return node
  }

  if (propertyPath.length === 1) {
    const newNode = {...node}
    delete (newNode as Record<string, unknown>)[propertyPath[0]!]
    return newNode
  }

  const [head, ...tail] = propertyPath
  const currentValue = (node as Record<string, unknown>)[head!]

  if (currentValue === null || typeof currentValue !== 'object') {
    return node
  }

  return {
    ...node,
    [head!]: deepUnsetObject(currentValue as Record<string, unknown>, tail),
  }
}

/**
 * Deep unset a value at a property path on a plain object.
 */
function deepUnsetObject(
  object: Record<string, unknown>,
  propertyPath: string[],
): Record<string, unknown> {
  if (propertyPath.length === 0) {
    return object
  }

  if (propertyPath.length === 1) {
    const newObject = {...object}
    delete newObject[propertyPath[0]!]
    return newObject
  }

  const [head, ...tail] = propertyPath
  const currentValue = object[head!]

  if (currentValue === null || typeof currentValue !== 'object') {
    return object
  }

  return {
    ...object,
    [head!]: deepUnsetObject(currentValue as Record<string, unknown>, tail),
  }
}
