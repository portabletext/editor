const warned = new Set<string>()

/**
 * Fires the deprecation warning only when a caller actually reads the
 * legacy callback field, so removal in the next major can point at a
 * runtime warning actually observed by consumers, not only the
 * `@deprecated` JSDoc tag.
 */
function warnDeprecatedCallbackArg(field: string, replacement: string): void {
  if (warned.has(field)) {
    return
  }
  warned.add(field)
  console.warn(
    `[@portabletext/plugin-markdown-shortcuts] Reading the deprecated \`${field}\` callback argument; read \`${replacement}\` instead. It will be removed in the next major.`,
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
      warnDeprecatedCallbackArg('schema', 'context.schema')
      return arg.context.schema
    },
  }) as T & {schema: T['context']['schema']}
}

/**
 * Replaces the eager top-level `level` field on a callback argument with
 * a getter that mirrors `props.level`.
 */
export function withDeprecatedLevel<T extends {props: {level: number}}>(
  arg: T,
): T & {level: number} {
  return Object.defineProperty(arg, 'level', {
    enumerable: true,
    configurable: true,
    get() {
      warnDeprecatedCallbackArg('level', 'props.level')
      return arg.props.level
    },
  }) as T & {level: number}
}
