/**
 * @public
 */
export type Schema = {
  block: {
    name: string
    fields?: ReadonlyArray<FieldDefinition>
  }
  span: {
    name: string
  }
  styles: ReadonlyArray<StyleSchemaType>
  lists: ReadonlyArray<ListSchemaType>
  decorators: ReadonlyArray<DecoratorSchemaType>
  annotations: ReadonlyArray<AnnotationSchemaType>
  blockObjects: ReadonlyArray<BlockObjectSchemaType>
  inlineObjects: ReadonlyArray<InlineObjectSchemaType>
}

/**
 * @public
 */
export type StyleSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

/**
 * @public
 */
export type ListSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

/**
 * @public
 */
export type DecoratorSchemaType = BaseDefinition & {
  /**
   * @deprecated
   * Use `name` instead
   */
  value: string
}

/**
 * @public
 */
export type AnnotationSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type BlockObjectSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type InlineObjectSchemaType = BaseDefinition & {
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 * Describes a member type within an array field's `of`.
 * When `type` is `'block'`, PTE sub-schema properties (styles, decorators,
 * annotations, lists, inlineObjects) are available for configuring the
 * nested text block. Unspecified fields are inherited from the root schema
 * at `compileSchema` time.
 */
export type OfDefinition = BlockOfDefinition | ObjectOfDefinition

/**
 * @public
 * An `of` member with `type: 'block'` -- supports nested PTE sub-schema.
 *
 * When this entry appears in a container field's `of`, it declares a nested
 * text block. Each sub-schema field is inherited from the root schema when
 * absent, or fully overrides root when defined. Resolution happens at
 * `compileSchema` time; after compilation, all fields are populated and can
 * be read directly without merging.
 */
export type BlockOfDefinition = {
  type: 'block'
  name?: string
  title?: string
  styles?: ReadonlyArray<BaseDefinition>
  decorators?: ReadonlyArray<BaseDefinition>
  annotations?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<FieldDefinition>}
  >
  lists?: ReadonlyArray<BaseDefinition>
  inlineObjects?: ReadonlyArray<
    BaseDefinition & {fields?: ReadonlyArray<FieldDefinition>}
  >
}

/**
 * @public
 * An `of` member with any non-block type -- a named type reference.
 */
export type ObjectOfDefinition = {
  type: string
  name?: string
  title?: string
  fields?: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 */
export type FieldDefinition =
  | (BaseDefinition & {
      type: 'array'
      of?: ReadonlyArray<OfDefinition>
    })
  | (BaseDefinition & {
      type: 'string' | 'number' | 'boolean' | 'object'
    })

/**
 * @public
 */
export type BaseDefinition = {
  name: string
  title?: string
}
