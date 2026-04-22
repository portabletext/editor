import type {
  AnnotationSchemaType,
  BaseDefinition,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  StyleSchemaType,
} from '@portabletext/schema'

/**
 * Project a compiled `{type: 'block'}` entry's named-array resolved shape
 * (`styles`, `decorators`, `lists`) into the equivalent schema-type shape
 * used throughout the editor (`{name, value}`). Returns `undefined` when
 * the entry doesn't override the array — the caller falls back to root.
 */
export function asNamedTypes<
  T extends StyleSchemaType | DecoratorSchemaType | ListSchemaType,
>(resolved: ReadonlyArray<BaseDefinition> | undefined): Array<T> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({...entry, value: entry.name}) as T)
}

/**
 * Project a compiled `{type: 'block'}` entry's field-bearing resolved shape
 * (`annotations`, `inlineObjects`) into the schema-type shape used
 * throughout the editor. Returns `undefined` when the entry doesn't
 * override the array.
 *
 * The `fields` projection is unsafe at the type level (resolved fields are
 * typed as `ReadonlyArray<unknown>` in the schema package) but matches the
 * runtime shape emitted by `compileSchema`.
 */
export function asFieldedTypes<
  T extends AnnotationSchemaType | InlineObjectSchemaType,
>(
  resolved:
    | ReadonlyArray<BaseDefinition & {fields?: ReadonlyArray<unknown>}>
    | undefined,
): Array<T> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map(
    (entry) => ({...entry, fields: entry.fields ?? []}) as unknown as T,
  )
}
