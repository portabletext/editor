import type {OfDefinition, Schema} from '@portabletext/schema'
import type {
  Containers,
  RegisteredBlockObject,
  RegisteredContainer,
} from './container-types'
import {
  resolveContainerFieldResolution,
  type ContainerFieldFailure,
} from './resolve-container-field'

/**
 * Declares that objects of `type` hold child nodes in their `arrayField`.
 * Entries in `of` apply only to the children of this container, and take
 * precedence over a top-level declaration of the same type there.
 *
 * @public
 */
export type ContainerDeclaration = {
  kind: 'container'
  type: string
  arrayField: string
  of?: ReadonlyArray<ContainerDeclaration | BlockObjectDeclaration>
}

/**
 * Declares, inside a container's `of`, that objects of `type` are block
 * objects among that container's children, even where a top-level
 * declaration makes `type` a container.
 *
 * @public
 */
export type BlockObjectDeclaration = {
  kind: 'blockObject'
  type: string
}

/**
 * Resolves container declarations against a schema into the `Containers`
 * a `TraversalSnapshot` carries.
 *
 * A declaration names an object type and the array field that holds its
 * child nodes. Nested declarations in `of` apply to the container's
 * children only, so the same type can hold its children in different
 * fields at different positions, and a `blockObject` entry makes a type
 * a block object at that position.
 *
 * A declaration whose type isn't in the schema, or whose field is missing,
 * isn't an array or holds only primitive values, is skipped with a
 * `console.warn`, along with the declarations nested inside it.
 *
 * @public
 */
export function compileContainers(
  schema: Schema,
  containers: Iterable<ContainerDeclaration>,
): Containers {
  const resolved = new Map<string, RegisteredContainer>()
  for (const container of containers) {
    const config = resolveNestedContainer(schema, container, [])
    if (config) {
      resolved.set(container.type, config)
    }
  }
  return resolved
}

/**
 * Resolve a container declaration into a {@link RegisteredContainer},
 * resolving nested `of` entries to their own registrations (with resolved
 * `field`).
 *
 * `chain` is the list of ancestor type names (root-first) used to
 * produce a useful warning when a deeply-nested declaration is
 * unresolvable.
 */
function resolveNestedContainer(
  schema: Schema,
  container: ContainerDeclaration,
  chain: ReadonlyArray<string> = [],
  parentOf?: ReadonlyArray<OfDefinition>,
): RegisteredContainer | undefined {
  const resolution = resolveContainerFieldResolution(
    schema,
    container.type,
    container.arrayField,
    parentOf,
  )
  if ('failure' in resolution) {
    const location =
      chain.length > 0
        ? ` (nested inside ${chain.map((type) => `"${type}"`).join(' inside ')})`
        : ''
    console.warn(
      `compileContainers: ${describeContainerFailure(resolution.failure, container)}${location}. Declaration skipped.`,
    )
    return undefined
  }
  const field = resolution.field
  const nextChain = [...chain, container.type]
  const resolvedOf = container.of
    ? container.of.flatMap<RegisteredContainer | RegisteredBlockObject>(
        (entry) => {
          if (entry.kind === 'container') {
            const resolved = resolveNestedContainer(
              schema,
              entry,
              nextChain,
              field.of,
            )
            return resolved ? [resolved] : []
          }
          if (entry.kind === 'blockObject') {
            return [{kind: 'blockObject', type: entry.type}]
          }
          return []
        },
      )
    : undefined
  return {
    kind: 'container',
    type: container.type,
    field,
    ...(resolvedOf ? {of: resolvedOf} : {}),
  }
}

function describeContainerFailure(
  failure: ContainerFieldFailure,
  container: ContainerDeclaration,
): string {
  switch (failure) {
    case 'unknown-type':
      return `type "${container.type}" not found in the schema`
    case 'field-missing':
      return `field "${container.arrayField}" not found on type "${container.type}"`
    case 'field-not-array':
      return `field "${container.arrayField}" on type "${container.type}" is not an array`
    case 'field-primitive-only':
      return `field "${container.arrayField}" on type "${container.type}" contains only primitive types and cannot hold block content`
  }
}
