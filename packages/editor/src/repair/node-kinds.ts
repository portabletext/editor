import type {Schema} from '@portabletext/schema'

export function isSpanNode(
  schema: Schema,
  node: unknown,
): node is {_type: string; _key: string; text?: unknown} {
  return typeOf(node) === schema.span.name
}

export function isTextBlockNode(
  schema: Schema,
  node: unknown,
): node is {_type: string; _key: string; children?: unknown} {
  return typeOf(node) === schema.block.name
}

export function isObjectNode(
  schema: Schema,
  node: unknown,
): node is {_type: string; _key: string} {
  const type = typeOf(node)
  return (
    type !== undefined &&
    type !== schema.block.name &&
    type !== schema.span.name
  )
}

function typeOf(node: unknown): string | undefined {
  if (!node || (typeof node !== 'object' && typeof node !== 'function')) {
    return undefined
  }
  const type = (node as Record<string, unknown>)['_type']
  return typeof type === 'string' ? type : undefined
}
