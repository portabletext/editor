import {isObjectNode} from '../structural-correction'
import {createTextBlock} from './create-nodes'
import type {
  CaretContext,
  CaretCorrection,
  CaretEntry,
  CaretNode,
} from './types'

/**
 * Ensures a container's child array field exists and holds at least one
 * child.
 */
export function getContainerFieldCorrection(
  entry: CaretEntry,
  context: CaretContext,
): CaretCorrection | undefined {
  const {node, path} = entry

  if (!isObjectNode(context.schema, node)) {
    return undefined
  }

  const container = entry.container()

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

  let childNode: CaretNode | undefined
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
    } as CaretNode
  }

  if (needsField) {
    // Set the field with its initial child in a single operation instead
    // of two (set empty array + insert child).
    return {
      rule: 'container-field',
      type: 'set',
      path: [...path, field.name],
      value: childNode ? [childNode] : [],
    }
  }

  if (childNode) {
    return {
      rule: 'container-field',
      type: 'insert',
      path: [...path, field.name, 0],
      node: childNode,
      position: 'before',
    }
  }

  return undefined
}
