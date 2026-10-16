import {createTextBlock} from './create-nodes'
import type {
  RepairContainerField,
  RepairContext,
  RepairEntry,
  RepairFix,
  RepairNode,
} from './types'

/**
 * Ensures a container's child array field exists and holds at least one
 * child. `container` is what the engine resolved for the node at this
 * position, or `undefined` when the node isn't a container here.
 * `placeholderStyle` is only called when a placeholder text block is
 * created, since resolving it walks the node's ancestors.
 */
export function repairContainerField(
  entry: RepairEntry,
  container:
    | {field: RepairContainerField; placeholderStyle: () => string}
    | undefined,
  context: RepairContext,
): RepairFix | undefined {
  const {node, path} = entry

  if (!container) {
    return undefined
  }

  const {field} = container

  const nodeRecord = node as Record<string, unknown>
  const fieldValue = nodeRecord[field.name]
  const needsField = !Array.isArray(fieldValue)
  const needsChild = needsField || fieldValue.length === 0

  if (!needsChild) {
    return undefined
  }

  const acceptsBlocks = field.of.some(
    (definition) => definition.type === 'block',
  )
  const firstChildType = field.of.at(0)

  let childNode: RepairNode | undefined
  if (acceptsBlocks) {
    childNode = createTextBlock(context, container.placeholderStyle())
  } else if (firstChildType && firstChildType.type !== 'block') {
    // For inline declarations (`type: 'object'`), the actual type
    // identity is in `name`. For bare references (any other `type`),
    // the type itself is the identity.
    const childTypeName =
      firstChildType.type === 'object' && 'name' in firstChildType
        ? firstChildType.name
        : firstChildType.type
    childNode = {
      _type: childTypeName,
      _key: context.keyGenerator(),
    } as RepairNode
  }

  if (needsField) {
    // Set the field with its initial child in a single operation instead
    // of two (set empty array + insert child).
    return {
      type: 'set',
      path: [...path, field.name],
      value: childNode ? [childNode] : [],
      inverse: nodeRecord.hasOwnProperty(field.name)
        ? {type: 'set', path: [...path, field.name], value: fieldValue}
        : {type: 'unset', path: [...path, field.name]},
    }
  }

  if (childNode) {
    return {
      type: 'insert',
      path: [...path, field.name, 0],
      node: childNode,
      position: 'before',
    }
  }

  return undefined
}
