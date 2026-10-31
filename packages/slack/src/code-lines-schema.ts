import {getSubSchema, type Schema} from '@portabletext/schema'

export function codeLinesSchema(schema: Schema): Schema | undefined {
  const linesField = schema.blockObjects
    .find((blockObject) => blockObject.name === 'code')
    ?.fields.find((field) => field.name === 'lines')

  if (
    linesField?.type !== 'array' ||
    !linesField.of?.some((member) => member.type === 'block')
  ) {
    return undefined
  }

  return getSubSchema(schema, linesField.of)
}

// Keep in sync with the default style in
// `packages/editor/src/engine/core/normalize-node.ts` and
// `packages/editor/src/canonical-correction/rule.missing-style.ts`.
export function defaultCodeLineStyle(linesSchema: Schema): string | undefined {
  return linesSchema.styles.at(0)?.name
}
