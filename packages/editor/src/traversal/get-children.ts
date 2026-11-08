import {isTextBlock, isTypedObject} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {getContainerChildren} from './get-container-children'
import type {TraversalSnapshot} from './traversal-snapshot'
import {childEntries, walkedNode, walkPath} from './walk-path'

/**
 * Get the children of a node at a given path.
 *
 * @public
 */
export function getChildren(
  snapshot: TraversalSnapshot,
  path: Path,
): Array<{node: Node; path: Path}> {
  const walk = walkPath(snapshot, path)
  const node = walkedNode(walk)

  if (walk.status !== 'found' || (walk.nodes.length > 0 && !node)) {
    return []
  }

  return childEntries(snapshot.context.value, node)
}

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
    schema: EditorSchema
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
