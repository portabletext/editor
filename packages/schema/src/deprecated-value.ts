import type {BaseDefinition} from './schema'

let hasWarned = false

function warnDeprecatedValue(): void {
  if (hasWarned) {
    return
  }
  hasWarned = true
  console.warn(
    '[@portabletext/schema] Reading the deprecated `value` on compiled schema types; read `name` instead. `value` will be removed in the next major.',
  )
}

/**
 * Replaces the eager `value: definition.name` mirror with a getter so the
 * removal of `value` in the next major can point at a runtime warning
 * actually observed by consumers, not only the `@deprecated` JSDoc tag.
 */
export function withDeprecatedValue<T extends BaseDefinition>(
  definition: T,
): T & {value: string} {
  // `definition` may already be the output of a previous `withDeprecatedValue`
  // call (nested block schemas get re-resolved by `getSubSchema`). Spreading
  // it here would read `value` through its getter and warn on the library's
  // own re-wrap rather than on a consumer read, so an already-wrapped input
  // is returned unchanged.
  if (Object.getOwnPropertyDescriptor(definition, 'value')?.get) {
    return definition as T & {value: string}
  }

  const copy = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(definition),
  ) as T & {value: string}

  Object.defineProperty(copy, 'value', {
    enumerable: true,
    configurable: true,
    get() {
      warnDeprecatedValue()
      return definition.name
    },
    set(newValue: string) {
      // Matches the old eager `value` field's writable contract: assigning
      // replaces the deprecation getter with a plain data property instead
      // of throwing (strict-mode assignment to a getter-only property
      // throws).
      Object.defineProperty(copy, 'value', {
        enumerable: true,
        configurable: true,
        writable: true,
        value: newValue,
      })
    },
  })

  return copy
}
