import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {pathLevels} from '../engine/path/path-levels'
import {resolveContainerAt} from '../schema/resolve-container-at'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildFieldName} from './get-child-field-name'

/**
 * Recursively collect descendant paths using numeric indices.
 * Numeric indices avoid dedup collisions when siblings have duplicate
 * keys (pre-normalization).
 *
 * Threads the resolved {@link RegisteredContainer} for the current
 * node through recursion so positional `of` overrides apply when
 * the same `_type` is registered with different `arrayField`
 * values under different parents.
 */
function collectDescendantPaths(
  context: {
    schema: EditorSchema
    containers: Containers
  },
  node: Node,
  parentPath: Path,
  paths: Array<Path>,
  parent?: RegisteredContainer,
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

  // Resolve through the parent's `of` positional overrides first;
  // fall back to the top-level entry. Mirrors getChildrenOf logic
  // so positional same-`_type`-different-`arrayField` configurations
  // emit correct paths.
  let resolved: RegisteredContainer | undefined
  if (parent?.of) {
    for (const entry of parent.of) {
      if (entry.type === node._type && 'field' in entry) {
        resolved = entry
        break
      }
    }
  }
  if (!resolved) {
    resolved = context.containers.get(node._type)
  }
  if (!resolved) {
    return
  }
  const arrayField = resolved.field

  const fieldValue = (node as Record<string, unknown>)[arrayField.name]

  if (Array.isArray(fieldValue)) {
    for (let i = 0; i < fieldValue.length; i++) {
      const child = fieldValue[i] as Node
      const childPath: Path = [...parentPath, arrayField.name, i]
      paths.push(childPath)
      collectDescendantPaths(context, child, childPath, paths, resolved)
    }
  }
}

/**
 * Get the "dirty" paths generated from an operation.
 */
export function getDirtyPaths(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  op: EngineOperation,
): Array<Path> {
  switch (op.type) {
    case 'insert.text':
    case 'remove.text': {
      return pathLevels(op.path)
    }

    case 'set': {
      // Root-level value replacement: dirty all new children
      if (op.path.length === 0) {
        const levels: Array<Path> = [[]]
        if (Array.isArray(op.value)) {
          for (let i = 0; i < op.value.length; i++) {
            const child = op.value[i]
            if (
              typeof child !== 'object' ||
              child === null ||
              !('_key' in child) ||
              typeof child._key !== 'string'
            ) {
              continue
            }
            const childNode = child as Node
            const childPath: Path = [{_key: childNode._key}]
            levels.push(childPath)
            // Seed the walker with the child's own registration so it
            // can recurse into the child's container fields. At root,
            // a child is registered globally if at all.
            const childRegistration = context.containers.get(childNode._type)
            collectDescendantPaths(
              context,
              childNode,
              childPath,
              levels,
              childRegistration,
            )
          }
        }
        return levels
      }

      // The path is [...nodePath, propertyName]. Dirty the node path.
      const nodePath = op.path.slice(0, -1)
      const propertyName = op.path[op.path.length - 1]

      // Full node replacement: path ends at a keyed segment
      if (isKeyedSegment(propertyName)) {
        const levels = pathLevels(op.path)
        // Dirty descendants of the new value
        if (
          op.value !== null &&
          typeof op.value === 'object' &&
          !Array.isArray(op.value)
        ) {
          const valueNode = op.value as Node
          // The replacement node's own registration scopes descent. Resolve
          // positionally via its path so nested-only registrations are
          // recognized.
          const valueRegistration = resolveContainerAt(
            context.containers,
            context.value,
            op.path,
          )
          collectDescendantPaths(
            context,
            valueNode,
            op.path,
            levels,
            valueRegistration && 'field' in valueRegistration
              ? valueRegistration
              : undefined,
          )
        }
        return levels
      }

      let dirtyPath = nodePath

      // When _key changes, use the new key in the dirty path
      if (propertyName === '_key' && typeof op.value === 'string') {
        const lastSegment = dirtyPath[dirtyPath.length - 1]
        if (isKeyedSegment(lastSegment)) {
          dirtyPath = [...dirtyPath.slice(0, -1), {_key: op.value}]
        }
      }

      const levels = pathLevels(dirtyPath)

      // When a child array field is replaced, dirty the new children
      if (Array.isArray(op.value) && typeof propertyName === 'string') {
        const arrayFieldName = getChildFieldName(context, nodePath)

        if (arrayFieldName === propertyName) {
          // Each child's parent is the node at nodePath. Resolve
          // positionally so nested-only registrations are recognized.
          const parentRegistration = resolveContainerAt(
            context.containers,
            context.value,
            nodePath,
          )
          const seed =
            parentRegistration && 'field' in parentRegistration
              ? parentRegistration
              : undefined
          for (let i = 0; i < op.value.length; i++) {
            const child = op.value[i]

            if (typeof child !== 'object' || child === null) {
              continue
            }

            if (!('_key' in child) || typeof child._key !== 'string') {
              continue
            }

            const childNode = child as Node
            const childPath: Path = [
              ...nodePath,
              propertyName,
              {_key: childNode._key},
            ]
            levels.push(childPath)
            collectDescendantPaths(context, childNode, childPath, levels, seed)
          }
        }
      }

      return levels
    }

    case 'unset': {
      const lastSegment = op.path[op.path.length - 1]

      if (isKeyedSegment(lastSegment)) {
        const ancestors = pathLevels(op.path).slice(0, -1)
        return [...ancestors]
      }

      const nodePath = op.path.slice(0, -1)
      const propertyName = lastSegment

      // When _key is unset, the keyed segment in the dirty path no longer
      // resolves because the node lost its key. Replace the last keyed
      // segment with a numeric index so normalization can find the node.
      if (propertyName === '_key') {
        const lastNodeSegment = nodePath[nodePath.length - 1]

        if (isKeyedSegment(lastNodeSegment)) {
          // Walk the tree to find the siblings array containing the node
          let currentChildren: Array<Node> = context.value

          for (let i = 0; i < nodePath.length - 1; i++) {
            const segment = nodePath[i]

            if (typeof segment === 'string') {
              // Field name segment: descend into the field of the last found node
              continue
            }

            const node = isKeyedSegment(segment)
              ? currentChildren.find((child) => child._key === segment._key)
              : undefined

            if (!node) {
              break
            }

            // Look ahead for a field name to descend into
            const nextSegment = nodePath[i + 1]

            if (typeof nextSegment === 'string') {
              const fieldValue = (node as Record<string, unknown>)[nextSegment]

              if (Array.isArray(fieldValue)) {
                currentChildren = fieldValue as Array<Node>
              }
            }
          }

          // Find the keyless node among siblings
          const index = currentChildren.findIndex(
            (child) => child._key === undefined,
          )

          if (index !== -1) {
            return pathLevels([...nodePath.slice(0, -1), index])
          }
        }
      }

      return pathLevels(nodePath)
    }

    case 'insert': {
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
      // are also dirtied. Seed the walker with the inserted node's
      // parent registration resolved positionally - flat type-keyed
      // lookup misses nested-only registrations.
      const parentRegistration = resolveContainerAt(
        context.containers,
        context.value,
        parentPath(nodePath),
      )
      collectDescendantPaths(
        context,
        node,
        nodePath,
        levels,
        parentRegistration && 'field' in parentRegistration
          ? parentRegistration
          : undefined,
      )

      return levels
    }

    default: {
      return []
    }
  }
}
