import {
  applyAll,
  set as setPatchHelper,
  unset as unsetPatchHelper,
  type JSONValue,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {findNearestSpans} from '../../internal-utils/find-nearest-spans'
import {getValue} from '../../internal-utils/get-value'
import {safeStringify} from '../../internal-utils/safe-json'
import {getChildFieldName} from '../../paths/get-child-field-name'
import {serializePath} from '../../paths/serialize-path'
import {getNode} from '../../traversal/get-node'
import type {EditorSelection} from '../../types/editor'
import type {KeyedSegment} from '../../types/paths'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Range} from '../interfaces/range'
import {commonPath} from '../path/common-path'
import {isSiblingPath} from '../path/is-sibling-path'
import {parentPath} from '../path/parent-path'
import {splitNodePath} from '../path/split-node-path'
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

export function applyOperation(editor: Editor, op: EngineOperation): void {
  let transformSelection = false

  switch (op.type) {
    case 'insert': {
      const {path} = op
      let {node} = op

      if (!targetsStructuralChildren(editor, path)) {
        // The path addresses an element of a sidecar array (e.g.
        // `span.marks` or `block.markDefs`) rather than a structural
        // child. Apply the insert as a plain data patch on the root
        // block so the result matches what the datastore computed.
        // These operations only arrive from remote patches, so no
        // inverse is needed.
        applyOnRootBlock(editor, path, {
          type: 'insert',
          path: path.slice(1),
          position: op.position,
          // Sidecar array members aren't necessarily objects (e.g. `marks`
          // holds strings), so the node is plain JSON data here.
          items: [node as unknown as JSONValue],
        })

        transformSelection = true
        break
      }

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
            editor.blockIndexMap,
            path.slice(0, -1),
            lastSegment,
            children,
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

        return insertChildren(children, index, node)
      })

      transformSelection = true
      break
    }

    case 'insert.text': {
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

    case 'remove.text': {
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
        const lastSegment = path[path.length - 1]

        // Renaming a node's own `_key` moves how it resolves: from here on
        // it's found by the new key, so the inverse (which runs after the
        // rename) has to target that key too, or it can never find the
        // node to restore.
        const inversePath =
          lastSegment === '_key' &&
          typeof value === 'string' &&
          isKeyedSegment(path[path.length - 2])
            ? [...path.slice(0, -2), {_key: value}, '_key']
            : path

        op.inverse =
          previousValue === undefined
            ? {type: 'unset', path: inversePath}
            : {type: 'set', path: inversePath, value: previousValue}
      }

      // Root-level value replacement: set editor.snapshot.context.value directly
      if (path.length === 0) {
        if (Array.isArray(value)) {
          editor.snapshot.context.value =
            value as unknown as PortableTextBlock[]
        }
        transformSelection = true
        break
      }

      // Split path into node path (up to last keyed/numeric segment)
      // and property path (trailing string segments)
      const {nodePath: setNodePath, propertyPath: setPropertyPath} =
        splitNodePath(path)

      if (setNodePath.length === 0) {
        break
      }

      if (setPropertyPath.length === 0) {
        if (!targetsStructuralChildren(editor, setNodePath)) {
          // The path addresses an element of a sidecar array (e.g.
          // `span.marks[0]`). Apply the set as a plain data patch on the
          // root block; `modifyDescendant` can't reach these elements.
          applyOnRootBlock(editor, path, setPatchHelper(value, path.slice(1)))

          transformSelection = true
          break
        }

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
        } else {
          // Multiple property segments: deep set on the resolved node
          modifyDescendant(editor, setNodePath, (node) => {
            return deepSet(node, setPropertyPath, value)
          })
        }
      } else {
        // Node not found (e.g., markDefs path): apply on the root block
        const blockSegment = findBlockSegment(path)
        if (!blockSegment) {
          break
        }

        const blockIndex = resolveBlockIndex(editor, blockSegment)
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
        transformSelection = true
        break
      }

      // Node removal: last segment is a keyed or numeric reference to an
      // array member. Check this BEFORE splitting into node/property paths
      // since node removal doesn't need that split.
      const lastSegment = path[path.length - 1]
      if (
        (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') &&
        !targetsStructuralChildren(editor, path)
      ) {
        // The path addresses an element of a sidecar array (e.g.
        // `span.marks[0]` or `block.markDefs[_key==...]`) rather than a
        // structural child. Removing it never affects the selection, so
        // apply it as a plain data patch on the root block.
        if (!op.inverse && !editor.isProcessingRemoteChanges) {
          const arrayValue = getValue(
            editor.snapshot.context.value,
            path.slice(0, -1),
          )
          if (Array.isArray(arrayValue)) {
            op.inverse = {
              type: 'set',
              path: path.slice(0, -1),
              value: arrayValue,
            }
          }
        }

        applyOnRootBlock(editor, path, unsetPatchHelper(path.slice(1)))

        transformSelection = true
        break
      }
      if (isKeyedSegment(lastSegment) || typeof lastSegment === 'number') {
        // Transform the selection BEFORE removing the node from the tree.
        // `findNearestSpans` anchors on the removed node's position, so the
        // node must still be in the tree (and in `blockIndexMap`) to resolve
        // document order for keyed segments.
        if (editor.snapshot.context.selection) {
          let selection: EditorSelection = {
            ...editor.snapshot.context.selection,
          }

          for (const [point, key] of rangePoints(selection)) {
            const result = transformPoint(point, op)

            if (selection != null && result != null) {
              selection[key] = result
            } else {
              // The point sat inside the removed subtree; move it to
              // the span nearest to the removed node in document
              // order.
              const {previousSpan, nextSpan} = findNearestSpans(
                editor.snapshot,
                path,
              )

              let preferNext = false
              if (previousSpan && nextSpan) {
                if (isSiblingPath(previousSpan.path, path)) {
                  preferNext = false
                } else {
                  preferNext =
                    commonPath(previousSpan.path, path).length <
                    commonPath(nextSpan.path, path).length
                }
              }

              if (previousSpan && !preferNext) {
                selection![key] = {
                  path: previousSpan.path,
                  offset: previousSpan.node.text.length,
                }
              } else if (nextSpan) {
                selection![key] = {path: nextSpan.path, offset: 0}
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

        modifyChildren(editor, parentPath(path), (children) => {
          let index: number

          if (isKeyedSegment(lastSegment)) {
            index = resolveChildIndex(
              editor.blockIndexMap,
              path.slice(0, -1),
              lastSegment,
              children,
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

          return removeChildren(children, index, 1)
        })

        break
      }

      // Property removal: split path into node path and property path
      const {nodePath: unsetNodePath, propertyPath: unsetPropertyPath} =
        splitNodePath(path)

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
        const blockSegment = findBlockSegment(path)
        if (!blockSegment) {
          break
        }

        const blockIndex = resolveBlockIndex(editor, blockSegment)
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

    case 'set.selection': {
      const {newProperties} = op

      if (newProperties == null) {
        editor.snapshot.context.selection = null
        break
      }

      if (editor.snapshot.context.selection == null) {
        if (!isRange(newProperties)) {
          throw new Error(
            `Cannot apply an incomplete "set.selection" operation properties ${safeStringify(
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
      // insert.text operations without forcing downstream consumers to re-derive
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
 * Whether the last (keyed or numeric) segment of `path` addresses a member
 * of its owning node's structural child array.
 *
 * Remote patches can address elements of sidecar arrays — `span.marks`
 * (array of strings) and `block.markDefs` — whose paths also end in a keyed
 * or numeric segment. Those must not be routed through structural child
 * insertion/removal: the owning node's child field is a different array (or
 * doesn't exist at all), so the operation would corrupt the tree or throw.
 */
function targetsStructuralChildren(editor: Editor, path: Path): boolean {
  if (path.length < 2) {
    return true
  }

  const fieldSegment = path[path.length - 2]
  if (typeof fieldSegment !== 'string') {
    // Compact paths ([{_key}, {_key}] or numeric) always descend
    // structurally.
    return true
  }

  const structuralFieldName = getChildFieldName(
    {
      schema: editor.snapshot.context.schema,
      containers: editor.snapshot.context.containers,
      value: editor.snapshot.context.value,
    },
    path.slice(0, -2),
  )

  return structuralFieldName === fieldSegment
}

/**
 * Apply a patch on the root block of `path` as plain data (no structural
 * traversal), mirroring how the datastore applies it. Used for operations
 * addressing sidecar arrays that `modifyChildren`/`modifyDescendant` can't
 * reach. The patch's own `path` must be relative to the block (the leading
 * block segment stripped).
 */
function applyOnRootBlock(editor: Editor, path: Path, patch: Patch): void {
  const blockSegment = findBlockSegment(path)
  if (!blockSegment) {
    return
  }

  const blockIndex = resolveBlockIndex(editor, blockSegment)
  if (blockIndex === -1) {
    return
  }

  const block = editor.snapshot.context.value[blockIndex]
  if (!block) {
    return
  }

  const updatedBlock = applyAll(block, [patch])

  const newValue = editor.snapshot.context.value.slice()
  newValue[blockIndex] = updatedBlock
  editor.snapshot.context.value = newValue
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
 * Resolve a child index by keyed segment via `blockIndexMap`, falling
 * back to a linear scan when the map misses or disagrees with the tree
 * (e.g. unkeyed transient nodes, or paths outside registered container
 * fields such as `markDefs`).
 */
/**
 * Raw-array sibling of `resolveChildEntryIndex` (`traversal/`): this
 * and `resolveBlockIndex` run mid-`modifyChildren` against plain node
 * arrays, where no `{node, path}` entries exist to share the helper.
 */
function resolveChildIndex(
  blockIndexMap: ReadonlyMap<string, number>,
  parentSegments: Path,
  segment: KeyedSegment,
  children: Array<Node>,
): number {
  const index = blockIndexMap.get(serializePath([...parentSegments, segment]))
  if (index !== undefined && children[index]?._key === segment._key) {
    return index
  }
  return children.findIndex((child) => child._key === segment._key)
}

/**
 * Extract the block key from the first segment of a path.
 */
function findBlockSegment(path: Path): KeyedSegment | undefined {
  const firstSegment = path[0]
  if (isKeyedSegment(firstSegment)) {
    return firstSegment
  }
  return undefined
}

/**
 * Resolve a root block's index via `blockIndexMap`, falling back to a
 * linear scan when the map misses or disagrees with the tree.
 */
function resolveBlockIndex(editor: Editor, segment: KeyedSegment): number {
  const value = editor.snapshot.context.value
  const index = editor.blockIndexMap.get(serializePath([segment]))
  if (index !== undefined && value[index]?._key === segment._key) {
    return index
  }
  return value.findIndex((block) => block._key === segment._key)
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
