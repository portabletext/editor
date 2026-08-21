let hasWarned = false

/**
 * Fires the deprecation warning only when a caller actually reads the
 * legacy `schema` callback field, so removal in the next major can point
 * at a runtime warning actually observed by consumers, not only the
 * `@deprecated` JSDoc tag.
 */
function warnDeprecatedSchema(): void {
  if (hasWarned) {
    return
  }
  hasWarned = true
  console.warn(
    '[@portabletext/plugin-character-pair-decorator] Reading the deprecated `schema` callback argument; read `context.schema` instead. It will be removed in the next major.',
  )
}

/**
 * Replaces the eager top-level `schema` field on a callback argument with
 * a getter that mirrors `context.schema`.
 */
export function withDeprecatedSchema<T extends {context: {schema: unknown}}>(
  arg: T,
): T & {schema: T['context']['schema']} {
  return Object.defineProperty(arg, 'schema', {
    enumerable: true,
    configurable: true,
    get() {
      warnDeprecatedSchema()
      return arg.context.schema
    },
  }) as T & {schema: T['context']['schema']}
}
