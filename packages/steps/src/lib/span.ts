import type {Path} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  getSubSchema,
  isSpan,
  isTextBlock,
  type Schema,
} from '@portabletext/schema'
import type {ArrayKeyCache} from './array-index'
import {getValue} from './get-value'
import {isRecord} from './is-record'

export const defaultSchema = compileSchema(defineSchema({}))

export function isTextSpan(
  value: unknown,
  root: unknown,
  path: Path,
  schema?: Schema,
  cache?: ArrayKeyCache,
): value is {text: string} {
  if (
    !isRecord(value) ||
    typeof value['text'] !== 'string' ||
    path.includes('markDefs')
  ) {
    return false
  }
  const owner = getValue(root, path.slice(0, -2), cache)
  if (path.at(-2) !== 'children' || !isRecord(owner)) {
    return false
  }
  const localSchema = schemaAtPath(
    root,
    path.slice(0, -2),
    schema ?? defaultSchema,
    cache,
  )
  return (
    isTextBlock({schema: localSchema}, owner) &&
    isSpan({schema: localSchema}, value)
  )
}

// Mirrors `getPathSubSchema` in `editor/src/traversal/get-path-sub-schema.ts`,
// minus the container registry: a field is looked up on the node's own type.
function schemaAtPath(
  root: unknown,
  path: Path,
  schema: Schema,
  cache?: ArrayKeyCache,
): Schema {
  let value = root
  let localSchema = schema
  for (const segment of path) {
    if (typeof segment === 'string' && isRecord(value)) {
      localSchema = schemaForField(value, segment, localSchema)
    }
    value = getValue(value, [segment], cache)
  }
  return localSchema
}

export function schemaForField(
  value: Record<string, unknown>,
  fieldName: string,
  schema: Schema,
): Schema {
  const definition = [
    schema.block,
    ...schema.blockObjects,
    ...schema.inlineObjects,
    ...schema.annotations,
  ].find((definition) => definition.name === value['_type'])
  const field = definition?.fields?.find((field) => field.name === fieldName)
  return field?.type === 'array' && field.of
    ? getSubSchema(schema, field.of)
    : schema
}
