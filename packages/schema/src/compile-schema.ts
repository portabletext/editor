import type {SchemaDefinition} from './define-schema'
import type {
  AnnotationSchemaType,
  BaseDefinition,
  BlockOfDefinition,
  DecoratorSchemaType,
  FieldDefinition,
  InlineObjectSchemaType,
  ListSchemaType,
  ObjectOfDefinition,
  OfDefinition,
  Schema,
  StyleSchemaType,
} from './schema'

/**
 * Resolved root schema fields used to fill in unspecified fields on nested
 * `BlockOfDefinition` entries. This is a view into the root schema captured
 * before the `of` tree is walked, so nested blocks inherit the final
 * post-compile values (e.g. `styles` with `normal` prepended).
 */
type BlockInheritance = {
  styles: ReadonlyArray<StyleSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

function isBlockOfMember(member: OfDefinition): member is BlockOfDefinition {
  return member.type === 'block'
}

function compileOfMember(
  member: OfDefinition,
  inheritance: BlockInheritance,
): OfDefinition {
  if (isBlockOfMember(member)) {
    return compileBlockOfMember(member, inheritance)
  }
  return compileObjectOfMember(member, inheritance)
}

function compileBlockOfMember(
  member: BlockOfDefinition,
  inheritance: BlockInheritance,
): BlockOfDefinition {
  return {
    ...member,
    styles: member.styles
      ? member.styles.map((style) => ({...style, value: style.name}))
      : inheritance.styles,
    decorators: member.decorators
      ? member.decorators.map((decorator) => ({
          ...decorator,
          value: decorator.name,
        }))
      : inheritance.decorators,
    annotations: member.annotations
      ? member.annotations.map((annotation) => ({
          ...annotation,
          fields:
            annotation.fields?.map((field) =>
              compileField(field, inheritance),
            ) ?? [],
        }))
      : inheritance.annotations,
    lists: member.lists
      ? member.lists.map((list) => ({...list, value: list.name}))
      : inheritance.lists,
    inlineObjects: member.inlineObjects
      ? member.inlineObjects.map((inlineObject) => ({
          ...inlineObject,
          fields:
            inlineObject.fields?.map((field) =>
              compileField(field, inheritance),
            ) ?? [],
        }))
      : inheritance.inlineObjects,
  }
}

function compileObjectOfMember(
  member: ObjectOfDefinition,
  inheritance: BlockInheritance,
): ObjectOfDefinition {
  if (member.fields) {
    return {
      ...member,
      fields: member.fields.map((field) => compileField(field, inheritance)),
    }
  }
  return member
}

function compileField(
  field: FieldDefinition,
  inheritance: BlockInheritance,
): FieldDefinition {
  if (field.type === 'array' && field.of) {
    return {
      ...field,
      of: field.of.map((member) => compileOfMember(member, inheritance)),
    }
  }
  return field
}

function compileBaseDefinitionWithValue<T extends BaseDefinition>(
  definition: T,
): T & {value: string} {
  return {...definition, value: definition.name}
}

/**
 * @public
 */
export function compileSchema(definition: SchemaDefinition): Schema {
  const userStyles = (definition.styles ?? []).map(
    compileBaseDefinitionWithValue,
  )
  const styles = !userStyles.some((style) => style.value === 'normal')
    ? [
        {value: 'normal', name: 'normal', title: 'Normal'} as StyleSchemaType,
        ...userStyles,
      ]
    : userStyles

  const lists = (definition.lists ?? []).map(compileBaseDefinitionWithValue)
  const decorators = (definition.decorators ?? []).map(
    compileBaseDefinitionWithValue,
  )

  // Annotations and inline objects may contain array fields whose `of`
  // includes `{type: 'block'}`. Those nested blocks must inherit from the
  // fully-resolved root. So we build `inheritance` first using the shallow
  // (not-yet-resolved) annotations/inlineObjects — nested blocks inherit from
  // the top-level schema, not from a sibling annotation's schema. Then we
  // resolve annotations, block objects, and inline objects using that view.
  const annotationsShallow = (definition.annotations ?? []).map(
    (annotation) => ({
      ...annotation,
      fields: (annotation.fields ?? []) as ReadonlyArray<FieldDefinition>,
    }),
  )
  const inlineObjectsShallow = (definition.inlineObjects ?? []).map(
    (inlineObject) => ({
      ...inlineObject,
      fields: (inlineObject.fields ?? []) as ReadonlyArray<FieldDefinition>,
    }),
  )

  const inheritance: BlockInheritance = {
    styles,
    decorators,
    annotations: annotationsShallow,
    lists,
    inlineObjects: inlineObjectsShallow,
  }

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

      blockFields.push(compileField(field, inheritance))
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
    styles,
    lists,
    decorators,
    annotations: (definition.annotations ?? []).map((annotation) => ({
      ...annotation,
      fields:
        annotation.fields?.map((field) => compileField(field, inheritance)) ??
        [],
    })),
    blockObjects: (definition.blockObjects ?? []).map((blockObject) => ({
      ...blockObject,
      fields:
        blockObject.fields?.map((field) => compileField(field, inheritance)) ??
        [],
    })),
    inlineObjects: (definition.inlineObjects ?? []).map((inlineObject) => ({
      ...inlineObject,
      fields:
        inlineObject.fields?.map((field) => compileField(field, inheritance)) ??
        [],
    })),
  }
}
