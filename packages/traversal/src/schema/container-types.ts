import type {FieldDefinition, OfDefinition} from '@portabletext/schema'

/**
 * A container's child array field and optional positional registrations.
 * `field.of` lists the types permitted by the schema; `of` supplies the
 * registrations that apply to children at this position.
 *
 * @public
 */
export type RegisteredContainer = {
  /** Marks this entry as a container. */
  kind: 'container'
  type: string
  field: FieldDefinition & {
    type: 'array'
    of: ReadonlyArray<OfDefinition>
  }
  of?: ReadonlyArray<RegisteredContainer | RegisteredPositional>
}

export type ChildArrayField = RegisteredContainer['field']

/**
 * A span registration scoped to a container position.
 *
 * @public
 */
export type RegisteredSpan = {
  /** Marks this entry as a span. */
  kind: 'span'
  type: string
}

/**
 * A block object registration scoped to a container position.
 *
 * @public
 */
export type RegisteredBlockObject = {
  /** Marks this entry as a block object. */
  kind: 'blockObject'
  type: string
}

/**
 * An inline object registration scoped to a container position.
 *
 * @public
 */
export type RegisteredInlineObject = {
  /** Marks this entry as an inline object. */
  kind: 'inlineObject'
  type: string
}

/**
 * A non-container registration in a container's `of` array.
 *
 * @public
 */
export type RegisteredPositional =
  | RegisteredSpan
  | RegisteredBlockObject
  | RegisteredInlineObject

/**
 * Container registrations keyed by block object `_type`. Each entry names the
 * array field that holds the container's children. Entries in a container's
 * `of` override the top-level entry for that position.
 *
 * @public
 */
export type Containers = ReadonlyMap<string, RegisteredContainer>

export type ResolvedContainers = Map<
  string,
  import('../renderers/renderer.types').ContainerConfig
>
