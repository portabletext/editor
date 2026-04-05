import type {SchemaDefinition, StyleDefinition} from './define-schema'
import type {
  AnnotationSchemaType,
  DecoratorSchemaType,
  FieldDefinition,
  InlineObjectSchemaType,
  ListSchemaType,
  ObjectOfDefinition,
  OfDefinition,
  Schema,
  StyleSchemaType,
} from './schema'

function compileOfMember(member: OfDefinition): OfDefinition {
  if (member.type === 'block') {
    return member
  }
  return compileObjectOfMember(member)
}

function compileObjectOfMember(member: ObjectOfDefinition): ObjectOfDefinition {
  if (member.fields) {
    return {...member, fields: member.fields.map(compileField)}
  }
  return member
}

function compileField(field: FieldDefinition): FieldDefinition {
  if (field.type === 'array' && field.of) {
    return {
      ...field,
      of: field.of.map(compileOfMember),
    }
  }
  return field
}

/**
 * @public
 */
export function compileSchema(definition: SchemaDefinition): Schema {
  // The `value` field is a deprecated alias for `name` kept for
  // backwards compatibility with existing consumers.
  const topLevelDecorators = (definition.decorators ?? []).map((decorator) => ({
    ...decorator,
    value: decorator.name,
  }))
  const topLevelAnnotations = (definition.annotations ?? []).map(
    (annotation) => ({
      ...annotation,
      fields: annotation.fields?.map(compileField) ?? [],
    }),
  )
  const topLevelLists = (definition.lists ?? []).map((list) => ({
    ...list,
    value: list.name,
  }))
  const topLevelInlineObjects = (definition.inlineObjects ?? []).map(
    (inlineObject) => ({
      ...inlineObject,
      fields: inlineObject.fields?.map(compileField) ?? [],
    }),
  )

  const styles = (definition.styles ?? []).map((style) =>
    compileStyle(style, {
      topLevelDecorators,
      topLevelAnnotations,
      topLevelLists,
      topLevelInlineObjects,
    }),
  )

  const blockFields: Array<FieldDefinition> = []

  if (definition.block?.fields) {
    for (const field of definition.block.fields) {
      if (
        field.name === '_type' ||
        field.name === '_key' ||
        field.name === 'children' ||
        field.name === 'markDefs' ||
        field.name === 'style' ||
        field.name === 'listItem' ||
        field.name === 'level'
      ) {
        console.warn(
          `"${field.name}" is a reserved field name on Portable Text blocks`,
        )
        continue
      }

      blockFields.push(field)
    }
  }

  return {
    block: {
      name: definition.block?.name ?? 'block',
      ...(blockFields.length > 0 ? {fields: blockFields} : {}),
    },
    span: {
      name: 'span',
    },
    styles: !styles.some((style) => style.value === 'normal')
      ? [{value: 'normal', name: 'normal', title: 'Normal'}, ...styles]
      : styles,
    lists: topLevelLists,
    decorators: topLevelDecorators,
    annotations: topLevelAnnotations,
    blockObjects: (definition.blockObjects ?? []).map((blockObject) => ({
      ...blockObject,
      fields: blockObject.fields?.map(compileField) ?? [],
    })),
    inlineObjects: topLevelInlineObjects,
  }
}

/**
 * Compiles a style definition into a `StyleSchemaType`. Per-style restriction
 * references (which only carry a `name`) are resolved against the already-
 * compiled top-level arrays to produce the full schema types.
 */
function compileStyle(
  style: StyleDefinition,
  topLevel: {
    topLevelDecorators: ReadonlyArray<DecoratorSchemaType>
    topLevelAnnotations: ReadonlyArray<AnnotationSchemaType>
    topLevelLists: ReadonlyArray<ListSchemaType>
    topLevelInlineObjects: ReadonlyArray<InlineObjectSchemaType>
  },
): StyleSchemaType {
  const {decorators, annotations, lists, inlineObjects, ...rest} = style

  const compiled: StyleSchemaType = {
    ...rest,
    value: style.name,
  }

  if (decorators) {
    compiled.decorators = resolveRefs(decorators, topLevel.topLevelDecorators)
  }
  if (annotations) {
    compiled.annotations = resolveRefs(
      annotations,
      topLevel.topLevelAnnotations,
    )
  }
  if (lists) {
    compiled.lists = resolveRefs(lists, topLevel.topLevelLists)
  }
  if (inlineObjects) {
    compiled.inlineObjects = resolveRefs(
      inlineObjects,
      topLevel.topLevelInlineObjects,
    )
  }

  return compiled
}

function resolveRefs<T extends {name: string}>(
  refs: ReadonlyArray<{name: string}>,
  topLevel: ReadonlyArray<T>,
): Array<T> {
  return refs.map(
    (ref) => topLevel.find((item) => item.name === ref.name) ?? (ref as T),
  )
}
