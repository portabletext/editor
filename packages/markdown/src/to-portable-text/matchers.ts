import type {
  PortableTextObject,
  Schema,
  SchemaDefinition,
} from '@portabletext/schema'

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

    const filteredValue = schemaDefinition.fields.reduce<
      Record<string, unknown>
    >((filteredValue, field) => {
      const fieldValue = value[field.name as keyof typeof value]

      if (fieldValue !== undefined) {
        filteredValue[field.name] = fieldValue
      }

      return filteredValue
    }, {})

    return {
      _key: context.keyGenerator(),
      _type: schemaDefinition.name,
      ...filteredValue,
    }
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

    const filteredValue = schemaDefinition.fields.reduce<
      Record<string, unknown>
    >((filteredValue, field) => {
      const fieldValue = value[field.name as keyof typeof value]

      if (fieldValue !== undefined) {
        filteredValue[field.name] = fieldValue
      }

      return filteredValue
    }, {})

    return {
      _key: context.keyGenerator(),
      _type: schemaDefinition.name,
      ...filteredValue,
    }
  }
}

export type ExtractValue<
  TDefinition extends NonNullable<SchemaDefinition['blockObjects']>[0],
> = TDefinition extends {fields: ReadonlyArray<{name: infer TNames}>}
  ? Record<TNames & string, unknown>
  : Record<string, never>
