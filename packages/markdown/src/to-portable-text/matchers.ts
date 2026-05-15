import type {
  PortableTextBlock,
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

/**
 * Builds an `ObjectMatcher` that filters the parser-emitted value down to
 * the schema's declared fields and stamps it with the schema's `name` as
 * `_type` plus a generated `_key`.
 *
 * @public
 */
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

/**
 * Builds an `ObjectMatcher` for an editor-shaped `code-block` that splits
 * the parser-emitted `code: string` source into an array of text blocks
 * (one per line) under the configured field name.
 *
 * Editors typically need a text-block-per-line shape so the caret can land
 * inside, selection can span lines, and undo/redo coalesces per keystroke.
 * The string-only shape from `buildObjectMatcher` does not support that.
 *
 * Pass the same `BlockObjectDefinition` that the schema declares; the
 * helper reads its field name to know what to call the lines array.
 *
 * @public
 */
export function buildCodeBlockObjectMatcher<
  TDefinition extends {name: string; fields: ReadonlyArray<{name: string}>},
>(
  definition: TDefinition,
): ObjectMatcher<{language: string | undefined; code: string}> {
  // The lines-shaped field is whichever field isn't `language`. For a
  // `{language, lines}` definition that picks `lines`; for any other
  // editor-shaped definition with a custom name (e.g. `source`), it
  // picks that. Avoids hardcoding `lines` while keeping the API simple.
  const linesField =
    definition.fields.find((field) => field.name !== 'language')?.name ??
    'lines'

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

    const lines = (value.code ?? '').split('\n').map((lineText) => ({
      _type: 'block',
      _key: context.keyGenerator(),
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: context.keyGenerator(),
          text: lineText,
          marks: [],
        },
      ],
      markDefs: [],
    }))

    return {
      _key: context.keyGenerator(),
      _type: schemaDefinition.name,
      ...(value.language !== undefined ? {language: value.language} : {}),
      [linesField]: lines,
    }
  }
}

/**
 * Builds an `ObjectMatcher` for an editor-shaped `table` that renames the
 * parser-emitted `cells[i].value` field to a configurable name (typically
 * `content`, matching what other container shapes use for their child
 * blocks field).
 *
 * The renamed shape is symmetric with `callout.content`, `blockquote.content`,
 * and `list-item.content` - useful when registering `cell` as a container in
 * the editor.
 *
 * @public
 */
/**
 * Builds an `ObjectMatcher` for a `table` that renames the parser-emitted
 * `cells[i].value` field to `cells[i].content` - symmetric with the other
 * container shapes (`callout.content`, `blockquote.content`,
 * `list-item.content`) and useful when registering `cell` as a container
 * in the editor.
 *
 * @public
 */
export function buildTableObjectMatcher<
  TDefinition extends {name: string; fields: ReadonlyArray<{name: string}>},
>(
  definition: TDefinition,
): ObjectMatcher<{
  headerRows: number | undefined
  rows: Array<{
    _key: string
    _type: 'row'
    cells: Array<{
      _type: 'cell'
      _key: string
      value: Array<PortableTextBlock>
    }>
  }>
}> {
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

    return {
      _key: context.keyGenerator(),
      _type: schemaDefinition.name,
      headerRows: value.headerRows,
      rows: value.rows.map((row) => ({
        _type: 'row',
        _key: row._key,
        cells: row.cells.map((cell) => ({
          _type: 'cell',
          _key: cell._key,
          content: cell.value,
        })),
      })),
    }
  }
}
