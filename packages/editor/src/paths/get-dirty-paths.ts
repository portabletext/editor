import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditableTypes} from '../schema/editable-types'
import type {Node} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import type {Path} from '../slate/interfaces/path'
import {pathLevels} from '../slate/path/path-levels'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildFieldName} from './get-child-field-name'

/**
 * Recursively collect descendant paths using numeric indices.
 * Numeric indices avoid dedup collisions when siblings have duplicate
 * keys (pre-normalization).
 *
 * Uses the schema and editableTypes to resolve child array fields
 * rather than guessing from object properties.
 */
function collectDescendantPaths(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
  },
  node: Node,
  parentPath: Path,
  paths: Array<Path>,
  scopePrefix: string,
): void {
  // Text blocks always use 'children'
  if (isTextBlock(context, node)) {
    const children = node.children
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        paths.push([...parentPath, 'children', i])
      }
    }
    return
  }

  // For container types, resolve the child array field from the schema
  const scopedName = scopePrefix ? `${scopePrefix}.${node._type}` : node._type

  const arrayField = context.editableTypes.get(scopedName)?.[0]

  if (arrayField) {
    const fieldValue = (node as Record<string, unknown>)[arrayField.name]

    if (Array.isArray(fieldValue)) {
      for (let i = 0; i < fieldValue.length; i++) {
        const child = fieldValue[i] as Node
        const childPath: Path = [...parentPath, arrayField.name, i]
        paths.push(childPath)
        collectDescendantPaths(context, child, childPath, paths, scopedName)
      }
    }
  }
}

/**
 * Build the scoped type name for a node at the given path by walking
 * ancestor nodes in the tree.
 *
 * Returns the scope prefix (ancestor type chain) needed to resolve
 * nested container child fields.
 */
function buildScopedName(value: Array<Node>, path: Path): string {
  const types: Array<string> = []
  let currentChildren: Array<Node> = value

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (typeof segment === 'string') {
      continue
    }

    let node: Node | undefined

    if (isKeyedSegment(segment)) {
      node = currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      node = currentChildren[segment]
    }

    if (!node) {
      break
    }

    types.push(node._type)

    // Look ahead for a field name segment to descend into
    const nextSegment = path[i + 1]
    if (typeof nextSegment === 'string') {
      const fieldValue = (node as Record<string, unknown>)[nextSegment]
      if (Array.isArray(fieldValue)) {
        currentChildren = fieldValue as Array<Node>
      }
    }
  }

  return types.join('.')
}

/**
 * Get the "dirty" paths generated from an operation.
 */
export function getDirtyPaths(
  context: {
    schema: EditorSchema
    editableTypes: EditableTypes
    value: Array<Node>
  },
  op: Operation,
): Array<Path> {
  switch (op.type) {
    case 'insert_text':
    case 'remove_text':
    case 'set_node': {
      let {path} = op

      // When set_node changes a node's _key, the dirty path must use the
      // new key so the normalizer can find the node after the mutation.
      if (op.type === 'set_node' && typeof op.newProperties._key === 'string') {
        const newKey = op.newProperties._key
        const lastSegment = path[path.length - 1]
        if (isKeyedSegment(lastSegment)) {
          path = [...path.slice(0, -1), {_key: newKey}]
        }
      }

      const levels = pathLevels(path)

      // When set_node replaces a child array field, the new children
      // need normalization. Dirty their paths and their descendants'
      // paths so the normalizer visits them.
      if (op.type === 'set_node') {
        const childFieldName = getChildFieldName(context, path)

        if (childFieldName) {
          const newChildren = (op.newProperties as Record<string, unknown>)[
            childFieldName
          ]

          if (Array.isArray(newChildren)) {
            const scopedName = buildScopedName(context.value, path)

            for (let i = 0; i < newChildren.length; i++) {
              const child = newChildren[i]

              if (typeof child !== 'object' || child === null) {
                continue
              }

              if (!('_key' in child) || typeof child._key !== 'string') {
                continue
              }

              const childNode = child as Node
              const childPath: Path = [
                ...path,
                childFieldName,
                {_key: childNode._key},
              ]
              levels.push(childPath)
              collectDescendantPaths(
                context,
                childNode,
                childPath,
                levels,
                scopedName,
              )
            }
          }
        }
      }

      return levels
    }

    case 'insert_node': {
      const {node, path} = op

      // The operation path is the reference sibling (for position-based
      // inserts), not the inserted node's final location. Dirty the
      // ancestors of the reference path AND the inserted node's own path.
      const levels = pathLevels(path)

      const nodePath = [...path]
      for (let i = nodePath.length - 1; i >= 0; i--) {
        if (isKeyedSegment(nodePath[i]) || typeof nodePath[i] === 'number') {
          nodePath[i] = {_key: node._key}
          break
        }
      }
      levels.push(nodePath)

      if (isSpan(context, node)) {
        return levels
      }

      // Use index-based child paths to avoid dedup collisions when
      // children have duplicate keys (pre-normalization). Walk all
      // child array fields via the schema so container descendants
      // are also dirtied.
      collectDescendantPaths(context, node, nodePath, levels, '')

      return levels
    }

    case 'remove_node': {
      const {path} = op
      const ancestors = pathLevels(path).slice(0, -1)
      return [...ancestors]
    }

    default: {
      return []
    }
  }
}
