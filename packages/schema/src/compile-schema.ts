import type {SchemaDefinition} from './define-schema'
import type {Schema} from './schema'

/**
 * @public
 */
export function compileSchema(definition: SchemaDefinition): Schema {
  const styles = (definition.styles ?? []).map((style) => ({
    ...style,
    value: style.name,
  }))

  return {
    block: {
      name: definition.block?.name ?? 'block',
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
      fields: annotation.fields ?? [],
    })),
    blockObjects: (definition.blockObjects ?? []).map((blockObject) => ({
      ...blockObject,
      fields: blockObject.fields ?? [],
    })),
    inlineObjects: (definition.inlineObjects ?? []).map((inlineObject) => ({
      ...inlineObject,
      fields: inlineObject.fields ?? [],
    })),
  }
}
