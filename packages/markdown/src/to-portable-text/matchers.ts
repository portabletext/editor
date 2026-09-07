import type {
  PortableTextObject,
  Schema,
  SchemaDefinition,
} from '@portabletext/schema'

/**
 * Fields a default object/annotation matcher (`buildObjectMatcher`,
 * `buildAnnotationMatcher`) silently dropped while filtering a converted
 * value down to the schema's declared fields: the keys the conversion
 * supplied that the schema's field list doesn't declare, so they never made
 * it into the built object. Tagged onto the matcher's return value; read it
 * back with `readDroppedFields`. A consumer-supplied matcher's return value
 * never carries this: its own filtering, if any, is not this module's
 * business.
 */
export type DroppedFields = {
  construct: string
  keys: Array<string>
}

const droppedFieldsTag = Symbol('droppedFields')

export function readDroppedFields(
  object: PortableTextObject | undefined,
): DroppedFields | undefined {
  if (!object) {
    return undefined
  }
  return (object as unknown as Record<symbol, unknown>)[droppedFieldsTag] as
    | DroppedFields
    | undefined
}

function buildFilteredObject(
  schemaDefinition: {name: string; fields: ReadonlyArray<{name: string}>},
  value: Record<string, unknown>,
  keyGenerator: () => string,
): PortableTextObject {
  const filteredValue = schemaDefinition.fields.reduce<Record<string, unknown>>(
    (filteredValue, field) => {
      const fieldValue = value[field.name]

      if (fieldValue !== undefined) {
        filteredValue[field.name] = fieldValue
      }

      return filteredValue
    },
    {},
  )

  const object = {
    _key: keyGenerator(),
    _type: schemaDefinition.name,
    ...filteredValue,
  }

  const suppliedKeys = Object.entries(value)
    .filter(([, fieldValue]) => fieldValue !== undefined)
    .map(([key]) => key)
  const droppedKeys = suppliedKeys.filter((key) => !(key in filteredValue))

  if (droppedKeys.length > 0) {
    Object.defineProperty(object, droppedFieldsTag, {
      value: {construct: schemaDefinition.name, keys: droppedKeys},
      enumerable: false,
    })
  }

  return object
}

/**
 * Matcher function for mapping markdown elements to Portable Text block styles.
 *
 * @public
 */
export type StyleMatcher = ({
  context,
}: {
  context: {schema: Schema}
}) => string | undefined

export function buildStyleMatcher<TDefinition extends {name: string}>(
  definition: TDefinition,
): StyleMatcher {
  return ({context}) => {
    const schemaDefinition = context.schema.styles.find(
      (item) => item.name === definition.name,
    )

    if (!schemaDefinition) {
      return undefined
    }

    return schemaDefinition.name
  }
}

/**
 * Matcher function for mapping markdown list items to Portable Text list types.
 *
 * @public
 */
export type ListItemMatcher = ({
  context,
}: {
  context: {schema: Schema}
}) => string | undefined

export function buildListItemMatcher<TDefinition extends {name: string}>(
  definition: TDefinition,
): ListItemMatcher {
  return ({context}) => {
    const schemaDefinition = context.schema.lists.find(
      (item) => item.name === definition.name,
    )

    if (!schemaDefinition) {
      return undefined
    }

    return schemaDefinition.name
  }
}

/**
 * Matcher function for mapping markdown inline formatting to Portable Text decorators.
 *
 * @public
 */
export type DecoratorMatcher = ({
  context,
}: {
  context: {schema: Schema}
}) => string | undefined

export function buildDecoratorMatcher<TDefinition extends {name: string}>(
  definition: TDefinition,
): DecoratorMatcher {
  return ({context}) => {
    const schemaDefinition = context.schema.decorators.find(
      (item) => item.name === definition.name,
    )

    if (!schemaDefinition) {
      return undefined
    }

    return schemaDefinition.name
  }
}

/**
 * Matcher function for mapping markdown links to Portable Text annotations.
 *
 * @public
 */
export type AnnotationMatcher<
  TValue extends Record<string, unknown> = Record<string, never>,
> = ({
  context,
  value,
}: {
  context: {schema: Schema; keyGenerator: () => string}
  value: TValue
}) => PortableTextObject | undefined

export function buildAnnotationMatcher<TDefinition extends {name: string}>(
  definition: TDefinition,
): AnnotationMatcher<ExtractValue<TDefinition>> {
  return ({context, value}) => {
    const schemaDefinition = context.schema.annotations.find(
      (item) => item.name === definition.name,
    )

    if (!schemaDefinition) {
      return undefined
    }

    return buildFilteredObject(schemaDefinition, value, context.keyGenerator)
  }
}

/**
 * Matcher function for mapping markdown objects to Portable Text block or inline objects.
 *
 * @public
 */
export type ObjectMatcher<
  TValue extends Record<string, unknown> = Record<string, never>,
> = ({
  context,
  value,
  isInline,
}: {
  context: {schema: Schema; keyGenerator: () => string}
  value: TValue
  isInline: boolean
}) => PortableTextObject | undefined

export function buildObjectMatcher<TDefinition extends {name: string}>(
  definition: TDefinition,
): ObjectMatcher<ExtractValue<TDefinition>> {
  return ({context, value, isInline}) => {
    const schemaCollection = isInline
      ? context.schema.inlineObjects
      : context.schema.blockObjects

    const schemaDefinition = schemaCollection.find(
      (item) => item.name === definition.name,
    )

    if (!schemaDefinition) {
      return undefined
    }

    return buildFilteredObject(schemaDefinition, value, context.keyGenerator)
  }
}

export type ExtractValue<
  TDefinition extends NonNullable<SchemaDefinition['blockObjects']>[0],
> = TDefinition extends {fields: ReadonlyArray<{name: infer TNames}>}
  ? Record<TNames & string, unknown>
  : Record<string, never>
