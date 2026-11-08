import {
  applyAll,
  set as setPatchHelper,
  unset as unsetPatchHelper,
  type JSONValue,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {
  findNearestSpans,
  firstSpanIn,
} from '../../internal-utils/find-nearest-spans'
import {getValue} from '../../internal-utils/get-value'
import {toKeyedPatchPath} from '../../internal-utils/operation-to-patches'
import {safeStringify} from '../../internal-utils/safe-json'
import {serializePath} from '../../paths/serialize-path'
import type {EditorSelection} from '../../types/editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Range} from '../interfaces/range'
import {commonPath} from '../path/common-path'
import {isSiblingPath} from '../path/is-sibling-path'
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
import {hasRemoteFrame} from './apply-context'
import {getSetInverse} from './get-set-inverse'
import type {OperationTarget} from './operation-target'

export function applyOperation(
  editor: Editor,
  op: EngineOperation,
  target: OperationTarget,
): void {
  let transformSelection = false

  switch (op.type) {
    case 'insert': {
      const {path} = op
      let {node} = op

      if (target.kind === 'data') {
        // The path addresses an element of a sidecar array (e.g.
        // `span.marks` or `block.markDefs`) rather than a structural
        // child. Apply the insert as a plain data patch on the owning
        // node so the result matches what the datastore computed. These
        // operations only arrive from remote patches, so no inverse is
        // needed.
        applyOnNode(editor, target, {
          type: 'insert',
          path: target.dataPath,
          position: op.position,
          // Sidecar array members aren't necessarily objects (e.g. `marks`
          // holds strings), so the node is plain JSON data here.
          items: [node as unknown as JSONValue],
        })

        transformSelection = true
        break
      }

      if (target.kind === 'node' && target.propertyPath.length > 0) {
        throw new Error(
          `Cannot apply an "insert" operation at path ${serializePath(path)} because the last segment is a field name.`,
        )
      }

      const ownerNodes =
        target.kind === 'position'
          ? target.ownerNodes
          : target.kind === 'node'
            ? target.nodes.slice(0, -1)
            : undefined
      const siblingIndex =
        target.kind === 'position'
          ? target.index
          : target.kind === 'node'
            ? target.nodes.at(-1)!.index
            : undefined

      if (ownerNodes === undefined || siblingIndex === undefined) {
        break
      }

      modifyChildren(editor, ownerNodes, (children) => {
        // Ensure unique keys on inserted nodes (skip during remote/undo/redo)
        if (
          !editor.applyContext.some(
            (frame) =>
              frame.kind === 'remote' ||
              frame.kind === 'undo' ||
              frame.kind === 'redo',
          ) &&
          node._key !== undefined &&
          children.some((sibling) => sibling._key === node._key)
        ) {
          node = {...node, _key: editor.snapshot.context.keyGenerator()}
          op.node = node
        }

        const index =
          target.kind === 'node' && op.position === 'after'
            ? siblingIndex + 1
            : target.kind === 'position' && op.position === 'after'
              ? siblingIndex + 1
              : siblingIndex

        if (index > children.length) {
          throw new Error(
            `Cannot apply an "insert" operation at path ${serializePath(path)} because the destination is past the end of the node.`,
          )
        }

        if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
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
      const {offset, text} = op
      if (text.length === 0) {
        break
      }

      if (target.kind !== 'node') {
        break
      }

      modifyLeaf(editor, target.nodes, (node) => {
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
      const {offset, text} = op
      if (text.length === 0) {
        break
      }

      if (target.kind !== 'node') {
        break
      }

      modifyLeaf(editor, target.nodes, (node) => {
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

      if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
        op.inverse = getSetInverse(editor, path, value)
      }

      if (target.kind === 'root') {
        if (Array.isArray(value)) {
          editor.snapshot.context.value =
            value as unknown as PortableTextBlock[]
        }
        transformSelection = true
        break
      }

      if (target.kind === 'data') {
        // The path addresses data inside a sidecar array (e.g.
        // `span.marks[0]` or a `markDefs` entry). Apply the set as a plain
        // data patch on the owning node.
        applyOnNode(editor, target, setPatchHelper(value, target.dataPath))

        transformSelection = true
        break
      }

      if (target.kind !== 'node') {
        break
      }

      const {nodes, propertyPath} = target

      if (propertyPath.length === 0) {
        // Full node replacement: replace the node at the path with value
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          modifyDescendant(editor, nodes, () => {
            return value as Node
          })
        }
        transformSelection = true
        break
      }

      if (propertyPath.length === 1) {
        const propertyName = propertyPath[0]!
        modifyDescendant(editor, nodes, (node) => {
          return {...node, [propertyName]: value} as typeof node
        })
      } else {
        // Multiple property segments: deep set on the resolved node
        modifyDescendant(editor, nodes, (node) => {
          return deepSet(node, propertyPath, value)
        })
      }

      transformSelection = true
      break
    }

    case 'unset': {
      const {path} = op

      // Root-level unset: remove all children
      if (target.kind === 'root') {
        if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
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

      if (target.kind === 'data') {
        // The path addresses an element of a sidecar array (e.g.
        // `span.marks[0]` or `block.markDefs[_key==...]`) rather than a
        // structural child. Removing it never affects the selection, so
        // apply it as a plain data patch on the node the walk reached.
        if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
          if (typeof path[path.length - 1] === 'string') {
            const previousValue = getValue(editor.snapshot.context.value, path)
            if (previousValue === undefined) {
              break
            }
            op.inverse = {type: 'set', path, value: previousValue}
          } else {
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
        }

        applyOnNode(editor, target, unsetPatchHelper(target.dataPath))

        transformSelection = true
        break
      }

      if (target.kind !== 'node') {
        break
      }

      if (target.propertyPath.length === 0) {
        const removedNode = target.nodes.at(-1)!
        // Transform the selection BEFORE removing the node from the tree.
        // `findNearestSpans` anchors on the removed node's position, so the
        // node must still be in the tree (and in `blockIndexMap`) to resolve
        // document order for keyed segments.
        if (editor.snapshot.context.selection) {
          let selection: EditorSelection = {
            ...editor.snapshot.context.selection,
          }

          // Selection paths are keyed, so key the removed path too. A
          // numeric segment would neither match the selection in
          // `transformPoint` nor count as a sibling in `isSiblingPath`.
          const removedPath = toKeyedPatchPath(
            editor.snapshot.context.value,
            path,
          )

          for (const [point, key] of rangePoints(selection)) {
            const result = transformPoint(editor.snapshot.context, point, {
              ...op,
              path: removedPath,
            })

            if (result != null) {
              selection[key] = result
            } else {
              // The point sat inside the removed subtree; move it to
              // the span nearest to the removed node in document
              // order.
              const {previousSpan, nextSpan} = findNearestSpans(
                editor.snapshot,
                removedPath,
              )

              const preferNext =
                nextSpan !== undefined &&
                (previousSpan === undefined ||
                  (!isSiblingPath(previousSpan.path, removedPath) &&
                    commonPath(previousSpan.path, removedPath).length <=
                      commonPath(nextSpan.path, removedPath).length))

              if (preferNext) {
                selection[key] = {path: nextSpan.path, offset: 0}
              } else if (previousSpan) {
                selection[key] = {
                  path: previousSpan.path,
                  offset: previousSpan.node.text.length,
                }
              } else {
                const ownSpan = firstSpanIn(editor.snapshot, removedPath)

                if (!ownSpan) {
                  selection = null
                  break
                }

                selection[key] = {path: ownSpan.path, offset: 0}
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

        modifyChildren(editor, target.nodes.slice(0, -1), (children) => {
          const index = removedNode.index

          if (index >= children.length) {
            throw new Error(
              `Cannot apply an "unset" (node removal) operation at path ${serializePath(path)} because the node was not found.`,
            )
          }

          if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
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

      // Property removal
      const {nodes, propertyPath: unsetPropertyPath} = target

      if (!op.inverse && !hasRemoteFrame(editor.applyContext)) {
        const previousValue = getValue(editor.snapshot.context.value, path)
        if (previousValue === undefined) {
          break
        }
        op.inverse = {type: 'set', path, value: previousValue}
      }

      if (unsetPropertyPath.length === 1) {
        const propertyName = unsetPropertyPath[0]!
        modifyDescendant(editor, nodes, (node) => {
          const newNode = {...node}
          delete (newNode as Record<string, unknown>)[propertyName]
          return newNode
        })
      } else {
        // Multiple property segments: deep unset on the resolved node
        modifyDescendant(editor, nodes, (node) => {
          return deepUnset(node, unsetPropertyPath)
        })
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
    const anchor = transformPoint(
      editor.snapshot.context,
      editor.snapshot.context.selection.anchor,
      op,
    )
    const focus = transformPoint(
      editor.snapshot.context,
      editor.snapshot.context.selection.focus,
      op,
    )

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
 * Apply a patch as plain data on the node a `data` target ends at, the way
 * the datastore applies it. Used for operations addressing sidecar arrays,
 * which have no structural children to insert into or remove from.
 */
function applyOnNode(
  editor: Editor,
  target: Extract<OperationTarget, {kind: 'data'}>,
  patch: Patch,
): void {
  modifyDescendant(editor, target.nodes, (node) => applyAll(node, [patch]))
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
