import {isTypedObject, type Schema} from '@portabletext/schema'

export function isObjectNode(
  schema: Schema,
  node: unknown,
): node is {_type: string; _key: string} {
  return (
    isTypedObject(node) &&
    node._type !== schema.block.name &&
    node._type !== schema.span.name
  )
}
