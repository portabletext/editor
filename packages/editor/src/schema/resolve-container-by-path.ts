import type {FieldDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  ContainerConfig,
  LeafConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {ChildArrayField, ResolvedContainers} from './container-types'
import {entryType} from './entry-type'

/**
 * Input shape required for rich positional resolution. Provided by
 * the slate editor (via .containers / .schema / .children) and by
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
  type: string,
): ReadonlyArray<FieldDefinition> | undefined {
  if (!parentField) {
    const rootMatch = schema.blockObjects.find(
      (blockObject) => blockObject.name === type,
    )
    if (!rootMatch) {
      return undefined
    }
    return 'fields' in rootMatch && rootMatch.fields ? rootMatch.fields : []
  }

  for (const member of parentField.of) {
    if (member.type === 'object' && 'name' in member && member.name === type) {
      return 'fields' in member && member.fields ? member.fields : []
    }
    if (
      member.type !== 'object' &&
      member.type !== 'block' &&
      member.type === type
    ) {
      const rootMatch = schema.blockObjects.find(
        (blockObject) => blockObject.name === type,
      )
      if (!rootMatch) {
        return undefined
      }
      return 'fields' in rootMatch && rootMatch.fields ? rootMatch.fields : []
    }
  }
  return undefined
}

/**
 * Walk the editor value from root to the parent of `path`, threading
 * the resolved rich {@link ContainerConfig} at each step so positional
 * registrations (nested only in a parent's `of`) are recognized.
 *
 * Returns the immediate parent's rich config and its path, or
 * `undefined` when the chain is broken (an ancestor is unregistered
 * or the parent is the editor root).
 */
function richDescentToParent(
  input: RichResolutionInput,
  path: Path,
): {parent: ContainerConfig; parentPath: Path} | undefined {
  // Collect keyed-segment indices.
  const keyedIndices: Array<number> = []
  for (let index = 0; index < path.length; index++) {
    if (isKeyedSegment(path[index])) {
      keyedIndices.push(index)
    }
  }
  if (keyedIndices.length <= 1) {
    return undefined
  }

  const richContainers = input.containers
  let currentChildren: ReadonlyArray<Node> = input.value
  let parent: ContainerConfig | undefined
  let parentPath: Path = []
  const resolvedPath: Path = []
  const targetKeyedIndex = keyedIndices[keyedIndices.length - 1]!

  let segmentIndex = 0
  while (segmentIndex < targetKeyedIndex) {
    const segment = path[segmentIndex]!
    if (typeof segment === 'string') {
      resolvedPath.push(segment)
      segmentIndex++
      continue
    }

    let node: Node | undefined
    if (isKeyedSegment(segment)) {
      node = currentChildren.find((child) => child._key === segment._key)
      resolvedPath.push(segment)
    } else if (typeof segment === 'number') {
      node = currentChildren.at(segment)
      if (node) {
        resolvedPath.push({_key: node._key})
      }
    } else {
      return undefined
    }
    if (!node) {
      return undefined
    }

    // Resolve this node's rich config using parent's positional `of`
    // first, then the global rich map.
    let resolved: ContainerConfig | LeafConfig | TextBlockConfig | undefined
    if (parent?.of) {
      for (const entry of parent.of) {
        if (entryType(entry) === node._type) {
          resolved = entry
          break
        }
      }
    }
    if (!resolved) {
      resolved = richContainers.get(node._type)
    }

    if (!resolved || !('container' in resolved)) {
      return undefined
    }
    const fieldValue = (node as Record<string, unknown>)[resolved.field.name]
    if (!Array.isArray(fieldValue)) {
      return undefined
    }
    parent = resolved
    parentPath = resolvedPath.slice()
    currentChildren = fieldValue as Array<Node>
    segmentIndex++
  }

  return parent ? {parent, parentPath} : undefined
}

/**
 * Resolve the rich {@link ContainerConfig} / {@link LeafConfig} /
 * {@link TextBlockConfig} for `node` at `path`. Engine-internal
 * chokepoint for "is this node a container/leaf at this position,
 * and what is its full configuration."
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
 *    when schema-at-position permits the registered `childField`
 *    (for containers) or simply declares `_type` (for leaves).
 *    Registration is type-keyed; activation is position-gated.
 */
export function resolveContainerByPath(
  input: RichResolutionInput,
  path: Path,
  node: Node,
): ContainerConfig | LeafConfig | TextBlockConfig | undefined {
  const descent = richDescentToParent(input, path)
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
    node._type,
  )
  if (!positionFields) {
    return undefined
  }
  const hasChildField = positionFields.some(
    (field) => field.name === global.container.childField,
  )
  if (!hasChildField) {
    return undefined
  }
  return global
}
