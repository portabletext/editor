import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getNodeDescendants} from '../node-traversal/get-nodes'
import type {Node} from '../slate/interfaces/node'
import type {Operation} from '../slate/interfaces/operation'
import type {Path} from '../slate/interfaces/path'
import {pathLevels} from '../slate/path/path-levels'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildFieldName} from './get-child-field-name'

/**
 * Get the "dirty" paths generated from an operation.
 */
export function getDirtyPaths(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
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

              for (const entry of getNodeDescendants(context, childNode)) {
                levels.push([...childPath, ...entry.path])
              }
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

      // Use index-based child paths for dirty path generation to avoid
      // dedup collisions when children have duplicate keys (pre-normalization).
      const nodeRecord = node as Record<string, unknown>
      const childArrays: Array<{fieldName: string; children: Array<Node>}> = []

      if ('children' in nodeRecord && Array.isArray(nodeRecord['children'])) {
        childArrays.push({
          fieldName: 'children',
          children: nodeRecord['children'] as Array<Node>,
        })
      }

      for (const {fieldName, children} of childArrays) {
        for (let i = 0; i < children.length; i++) {
          const childPath: Path = [...nodePath, fieldName, i]
          levels.push(childPath)
        }
      }

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
