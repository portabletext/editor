import type {SchemaDefinition} from './define-schema'
import type {
  FieldDefinition,
  ObjectOfDefinition,
  OfDefinition,
  Schema,
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
  const styles = (definition.styles ?? []).map((style) => ({
    ...style,
    value: style.name,
  }))

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
    lists: (definition.lists ?? []).map((list) => ({
      ...list,
      value: list.name,
    })),
    decorators: (definition.decorators ?? []).map((decorator) => ({
      ...decorator,
      value: decorator.name,
    })),
    annotations: (definition.annotations ?? []).map((annotation) => ({
      ...annotation,
      fields: annotation.fields?.map(compileField) ?? [],
    })),
    blockObjects: (definition.blockObjects ?? []).map((blockObject) => ({
      ...blockObject,
      fields: blockObject.fields?.map(compileField) ?? [],
    })),
    inlineObjects: (definition.inlineObjects ?? []).map((inlineObject) => ({
      ...inlineObject,
      fields: inlineObject.fields?.map(compileField) ?? [],
    })),
    nestedBlocks: (definition.nestedBlocks ?? []).map((nestedBlock) => ({
      ...nestedBlock,
      fields: nestedBlock.fields?.map(compileField) ?? [],
    })),
  }
}
