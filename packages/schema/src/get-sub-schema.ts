import type {
  AnnotationSchemaType,
  BaseDefinition,
  BlockObjectSchemaType,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  OfDefinition,
  Schema,
  StyleSchemaType,
} from './schema'

type ResolvedBlockOfDefinition = {
  type: 'block'
  name?: string
  styles?: ReadonlyArray<BaseDefinition>
  decorators?: ReadonlyArray<BaseDefinition>
  annotations?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<unknown>}
  >
  lists?: ReadonlyArray<BaseDefinition>
  inlineObjects?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<unknown>}
  >
}

function asNamedTypes<
  T extends StyleSchemaType | DecoratorSchemaType | ListSchemaType,
>(resolved: ReadonlyArray<BaseDefinition> | undefined): Array<T> | undefined {
  if (!resolved) {
    return undefined
  }
  return resolved.map((entry) => ({...entry, value: entry.name}) as T)
}

function asFieldedTypes<
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

/**
 * Derive the resolved sub-schema for a container field's `of` declaration.
 *
 * Containers declare which types are allowed inside them via the `of`
 * array on a child field. `getSubSchema(schema, of)` returns the resolved
 * `Schema` view that applies inside such a container, so operations and
 * validators that ask "what's allowed at this position?" can treat the
 * result like any other top-level `Schema`.
 *
 * The `{type: 'block'}` entry (if present) supplies the resolved
 * styles, decorators, annotations, lists, and inlineObjects. Non-block
 * `of` members become the schema's block objects. When there is no
 * `{type: 'block'}` entry the returned schema still carries the root
 * schema's `block` and `span` names but every validation list is
 * empty.
 *
 * @public
 */
export function getSubSchema(
  schema: Schema,
  of: ReadonlyArray<OfDefinition>,
): Schema {
  const blockMember = of.find(
    (member): member is OfDefinition & ResolvedBlockOfDefinition =>
      member.type === 'block',
  )

  const blockObjects: ReadonlyArray<BlockObjectSchemaType> = of
    .filter(
      (member): member is OfDefinition & {type: string} =>
        member.type !== 'block',
    )
    .map((member) => {
      const objectMember = member as {
        type: string
        name?: string
        title?: string
        fields?: ReadonlyArray<unknown>
      }
      return {
        name: objectMember.name ?? objectMember.type,
        title: objectMember.title,
        fields: (objectMember.fields ?? []) as BlockObjectSchemaType['fields'],
      }
    })

  if (!blockMember) {
    return {
      block: {name: schema.block.name, fields: schema.block.fields},
      span: {name: schema.span.name},
      styles: [],
      decorators: [],
      annotations: [],
      lists: [],
      inlineObjects: [],
      blockObjects,
    }
  }

  return {
    block: {
      name: blockMember.name ?? schema.block.name,
      fields: schema.block.fields,
    },
    span: {name: schema.span.name},
    styles: asNamedTypes<StyleSchemaType>(blockMember.styles) ?? schema.styles,
    decorators:
      asNamedTypes<DecoratorSchemaType>(blockMember.decorators) ??
      schema.decorators,
    annotations:
      asFieldedTypes<AnnotationSchemaType>(blockMember.annotations) ??
      schema.annotations,
    lists: asNamedTypes<ListSchemaType>(blockMember.lists) ?? schema.lists,
    inlineObjects:
      asFieldedTypes<InlineObjectSchemaType>(blockMember.inlineObjects) ??
      schema.inlineObjects,
    blockObjects,
  }
}
