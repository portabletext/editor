import type {FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import {walkNodes} from '../traversal/walk-path'
import {isNonArrayObject} from '../utils/is-non-array-object'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {ChildArrayField, ResolvedContainers} from './container-types'
import {
  collectDeclarations,
  resolveOfMember,
  type DeclarationScope,
} from './declarations-in-scope'
import {entryType} from './entry-type'

/**
 * Input shape required for rich positional resolution. Provided by
 * the editor engine (via .containers / .schema / .children) and by
 * test fixtures constructing a minimal editor-shaped object.
 */
export type RichResolutionInput = {
  containers: ResolvedContainers
  schema: EditorSchema
  value: ReadonlyArray<Node>
}

/**
 * Return the {@link FieldDefinition} list a schema declares for `type`
 * AT the given parent position, or `undefined` when no declaration of
 * `type` exists at this position.
 */
function schemaDeclarationFieldsAt(
  schema: EditorSchema,
  parentField: ChildArrayField | undefined,
  scope: DeclarationScope,
  type: string,
): ReadonlyArray<FieldDefinition> | undefined {
  if (!parentField) {
    return schema.blockObjects.find((blockObject) => blockObject.name === type)
      ?.fields
  }

  return resolveOfMember(parentField.of, type, schema, scope)?.fields
}

/**
 * Walk the editor value from root to the parent of `path`, threading
 * the resolved rich {@link ContainerConfig} at each step so positional
 * registrations (nested only in a parent's `of`) are recognized.
 *
 * Returns the immediate parent's rich config and its path,
 * `undefined` when the chain is broken (an ancestor is unregistered
 * or the parent is the editor root), or `'invalid'` when the path
 * cannot address anything.
 */
function richDescentToParent(
  input: RichResolutionInput,
  path: Path,
):
  | {
      parent: ContainerConfig
      parentPath: Path
      ancestors: Array<{type: string; field: string}>
    }
  | 'invalid'
  | undefined {
  const walk = walkNodes<ContainerConfig>(
    input.value as Array<Node>,
    path,
    (node, parent) => {
      const resolved = resolveRichEntry(input.containers, parent, node)
      if (!resolved || !('container' in resolved)) {
        return undefined
      }
      const fieldValue = (node as Record<string, unknown>)[resolved.field.name]
      return Array.isArray(fieldValue)
        ? {
            children: fieldValue as Array<Node>,
            fieldName: resolved.field.name,
            parent: resolved,
          }
        : undefined
    },
  )

  if (walk.status === 'invalid') {
    return 'invalid'
  }

  // The target is the node at the last keyed segment; its ancestors are the
  // walked nodes above it, each of which must be a registered container.
  const targetSegmentIndex = path.findLastIndex(isKeyedSegment)
  const targetNodeIndex = walk.nodes.findIndex(
    (node) => node.segmentIndex === targetSegmentIndex,
  )
  const ancestorNodes =
    targetNodeIndex === -1 ? [] : walk.nodes.slice(0, targetNodeIndex)
  const parentNode = ancestorNodes.at(-1)

  if (
    !parentNode ||
    ancestorNodes.some((node) => node.children === undefined)
  ) {
    return undefined
  }

  return {
    parent: parentNode.children!.parent!,
    parentPath: parentNode.path,
    ancestors: ancestorNodes.map((node) => ({
      type: node.node._type,
      field: node.children!.fieldName,
    })),
  }
}

/**
 * Resolve a node's rich config using its parent's positional `of` first,
 * then the global rich map.
 */
function resolveRichEntry(
  containers: ResolvedContainers,
  parent: ContainerConfig | undefined,
  node: Node,
):
  | ContainerConfig
  | SpanConfig
  | BlockObjectConfig
  | InlineObjectConfig
  | TextBlockConfig
  | undefined {
  if (!isNonArrayObject(node)) {
    return undefined
  }
  if (parent?.of) {
    for (const entry of parent.of) {
      if (entryType(entry) === node._type) {
        return entry
      }
    }
  }
  return containers.get(node._type)
}

/**
 * Resolve the rich {@link ContainerConfig} or one of the leaf-shaped
 * configs ({@link SpanConfig} / {@link BlockObjectConfig} /
 * {@link InlineObjectConfig} / {@link TextBlockConfig}) for `node` at
 * `path`. Engine-internal chokepoint for "is this node a container or
 * a registered renderable at this position, and what is its full
 * configuration."
 *
 * Reads from the editor's rich `containers` map. Not exposed on the
 * public `EditorContext`.
 *
 * Resolution rules:
 *
 * 1. **Chain validity.** Walk ancestors. If an object-node ancestor
 *    is unregistered (or resolved as a leaf), the chain is broken;
 *    return `undefined`. PTE only manages content inside registered
 *    container chains rooted in the editor's value array.
 *
 * 2. **Positional override.** When a registered parent declares the
 *    node's `_type` in its `of`, that registration wins.
 *
 * 3. **Global fallback with position-validity.** Falls back to the
 *    top-level rich `containers` map keyed by `_type`. Activates only
 *    when schema-at-position permits the registered `arrayField`
 *    (for containers) or declares `_type` (for leaves).
 *    Registration is type-keyed; activation is position-gated.
 */
export function resolveContainerByPath(
  input: RichResolutionInput,
  path: Path,
  node: Node,
):
  | ContainerConfig
  | SpanConfig
  | BlockObjectConfig
  | InlineObjectConfig
  | TextBlockConfig
  | undefined {
  const descent = richDescentToParent(input, path)

  if (descent === 'invalid') {
    return undefined
  }

  const parent = descent?.parent

  if (parent?.of) {
    for (const entry of parent.of) {
      if (entryType(entry) === node._type) {
        return entry
      }
    }
  }

  const global = input.containers.get(node._type)
  if (!global) {
    return undefined
  }
  const positionFields = schemaDeclarationFieldsAt(
    input.schema,
    parent?.field,
    collectDeclarations(input.schema, descent?.ancestors ?? []),
    node._type,
  )
  if (!positionFields) {
    return undefined
  }
  const hasChildField = positionFields.some(
    (field) => field.name === global.container.arrayField,
  )
  if (!hasChildField) {
    return undefined
  }
  return global
}
