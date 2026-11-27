import {isTextBlock, isTypedObject} from '@portabletext/schema'
import type {Schema} from '@portabletext/schema'
import type {Containers, RegisteredContainer} from './container-types'
import {getContainerChildren} from './get-container-children'
import {isNonArrayObject} from './is-non-array-object'
import type {Node} from './node'

/**
 * Resolve a node's editable child array.
 *
 * When `parent` is provided and its `of` declares a positional entry
 * matching `node._type`, that positional entry's `field` is used.
 * Otherwise the top-level `containers.get(node._type)` provides the
 * fallback.
 *
 * The returned `parent` is the resolved container entry for `node`
 * itself (used by the caller to thread further descent).
 *
 * Internal descent kernel shared by the positional traversal utilities
 * (`getChildren`, `getNode`, `getNodes`, `getAncestors`); it folds the
 * text-block, container, and root-document cases. Public consumers that
 * only need to descend containers use {@link getContainerChildren}.
 */
export function getNodeChildren(
  context: {
    schema: Schema
    containers: Containers
  },
  node: Node | {value: Array<Node>},
  parent?: RegisteredContainer,
):
  | {
      children: Array<Node>
      fieldName: string
      parent: RegisteredContainer | undefined
    }
  | undefined {
  if (!isNonArrayObject(node)) {
    return undefined
  }

  // Text blocks store children in .children
  if (isTextBlock(context, node)) {
    return {
      children: node.children,
      fieldName: 'children',
      parent: undefined,
    }
  }

  if (isTypedObject(node)) {
    const result = getContainerChildren(context.containers, node, parent)

    if (result) {
      return {
        children: result.children,
        fieldName: result.container.field.name,
        parent: result.container,
      }
    }
  }

  // Root context: has .value array but no _key or _type
  if (
    'value' in node &&
    Array.isArray(node['value']) &&
    !('_key' in node) &&
    !('_type' in node)
  ) {
    return {
      children: node['value'] as Array<Node>,
      fieldName: 'value',
      parent: undefined,
    }
  }

  return undefined
}
