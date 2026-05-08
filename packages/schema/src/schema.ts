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
 *
 * Three forms:
 * - `BlockOfDefinition` (`type: 'block'`) - declares a nested text block,
 *   with PTE sub-schema configurable inline.
 * - `InlineObjectOfDefinition` (`type: 'object'`) - inline-declares an
 *   object shape at this position. `name` is the type identity; `fields`
 *   defines the shape.
 * - `ReferenceOfDefinition` (`type: <name>`) - a bare reference to a type
 *   declared in `blockObjects` or `inlineObjects` at the schema root.
 */
export type OfDefinition =
  | BlockOfDefinition
  | InlineObjectOfDefinition
  | ReferenceOfDefinition

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
 * An `of` member with `type: 'object'` -- inline-declares an object shape.
 *
 * `name` is the type identity at this position. `fields` defines the shape.
 * Use this when the type only needs to exist at this nesting position. For
 * types referenced from multiple positions, declare them once at the schema
 * root (`blockObjects`) and use a `ReferenceOfDefinition` at each call site.
 */
export type InlineObjectOfDefinition = {
  type: 'object'
  name: string
  title?: string
  fields: ReadonlyArray<FieldDefinition>
}

/**
 * @public
 * An `of` member referencing a type declared elsewhere by name.
 *
 * `type` is the lookup key. Resolves to the matching entry in the schema's
 * `blockObjects` or `inlineObjects`. Self-references and cycles are
 * supported via cycle detection on the resolver walk.
 *
 * Throws at `compileSchema` time when the referenced type isn't declared.
 */
export type ReferenceOfDefinition = {
  type: string
  name?: string
  title?: string
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
