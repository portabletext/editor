import type {SchemaDefinition} from './define-schema'
import type {
  FieldDefinition,
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

  const styles: Array<StyleSchemaType> = (definition.styles ?? []).map(
    (style) => {
      const {
        decorators: styleDecorators,
        annotations: styleAnnotations,
        lists: styleLists,
        inlineObjects: styleInlineObjects,
        ...rest
      } = style

      const compiled: StyleSchemaType = {
        ...rest,
        value: style.name,
      }

      if (styleDecorators) {
        compiled.decorators = styleDecorators.map((ref) => {
          const found = topLevelDecorators.find((d) => d.name === ref.name)
          return found ?? {...ref, value: ref.name}
        })
      }
      if (styleAnnotations) {
        compiled.annotations = styleAnnotations.map((ref) => {
          const found = topLevelAnnotations.find((a) => a.name === ref.name)
          return found ?? {...ref, fields: []}
        })
      }
      if (styleLists) {
        compiled.lists = styleLists.map((ref) => {
          const found = topLevelLists.find((l) => l.name === ref.name)
          return found ?? {...ref, value: ref.name}
        })
      }
      if (styleInlineObjects) {
        compiled.inlineObjects = styleInlineObjects.map((ref) => {
          const found = topLevelInlineObjects.find(
            (io) => io.name === ref.name,
          )
          return found ?? {...ref, fields: []}
        })
      }

      return compiled
    },
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
