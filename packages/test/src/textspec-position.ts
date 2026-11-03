import {getSubSchema, isTextBlock, isTypedObject} from '@portabletext/schema'
import type {Schema} from '@portabletext/schema'
import type {
  TextspecContainerRegistration,
  TextspecContainers,
  TextspecSelectionPoint,
} from './from-textspec'

/**
 * `schema` is always `rootSchema` narrowed by the enclosing container's
 * `field.of`, never a parent's already narrowed schema. Keep in sync with
 * `getPathSubSchema` in `packages/editor/src/traversal/get-path-sub-schema.ts`.
 */
export type TextspecPosition = {
  rootSchema: Schema
  containers: TextspecContainers
  container: TextspecContainerRegistration | undefined
  schema: Schema
}

type TextspecPathEntry = {
  node: Record<string, unknown>
  index: number
  /**
   * Inline children share the position of their text block.
   */
  position: TextspecPosition
}

export function rootPosition(
  schema: Schema,
  containers: TextspecContainers,
): TextspecPosition {
  return {rootSchema: schema, containers, container: undefined, schema}
}

export function containerPosition(
  position: TextspecPosition,
  registration: TextspecContainerRegistration,
): TextspecPosition {
  return {
    rootSchema: position.rootSchema,
    containers: position.containers,
    container: registration,
    schema: getSubSchema(position.rootSchema, registration.field.of),
  }
}

export function resolveTextspecContainer(
  position: TextspecPosition,
  textspecType: string,
): TextspecContainerRegistration | undefined {
  return resolveContainer(
    position,
    (type) => type.toUpperCase() === textspecType,
  )
}

export function childArrayField(
  position: TextspecPosition,
  node: unknown,
): {name: string; position: TextspecPosition} | undefined {
  if (isTextBlock({schema: position.schema}, node)) {
    return {name: 'children', position}
  }

  if (!isTypedObject(node)) {
    return undefined
  }

  const registration = resolveContainer(position, (type) => type === node._type)

  if (!registration) {
    return undefined
  }

  return {
    name: registration.field.name,
    position: containerPosition(position, registration),
  }
}

/**
 * Numeric segments left over below a span are textspec mark nesting and are
 * ignored.
 */
export function getPathEntries(
  position: TextspecPosition,
  value: ReadonlyArray<unknown>,
  path: ReadonlyArray<TextspecSelectionPoint['path'][number]>,
): Array<TextspecPathEntry> | undefined {
  const entries: Array<TextspecPathEntry> = []
  let currentChildren = value
  let currentPosition = position
  let segmentIndex = 0

  while (segmentIndex < path.length) {
    const segment = path[segmentIndex]
    let index: number

    if (typeof segment === 'number') {
      index = segment
    } else if (
      typeof segment === 'object' &&
      segment !== null &&
      '_key' in segment
    ) {
      index = currentChildren.findIndex(
        (child) => isTypedObject(child) && child['_key'] === segment._key,
      )
    } else {
      return undefined
    }

    const node = currentChildren[index]

    if (!isTypedObject(node)) {
      return undefined
    }

    entries.push({node, index, position: currentPosition})
    segmentIndex++

    const child = childArrayField(currentPosition, node)

    if (!child) {
      return onlyIndices(path.slice(segmentIndex)) ? entries : undefined
    }

    const nextSegment = path[segmentIndex]

    if (typeof nextSegment === 'string') {
      if (nextSegment !== child.name) {
        return undefined
      }
      segmentIndex++
    }

    const field = node[child.name]

    if (!Array.isArray(field)) {
      return onlyIndices(path.slice(segmentIndex)) ? entries : undefined
    }

    currentChildren = field
    currentPosition = child.position
  }

  return entries
}

function onlyIndices(
  segments: ReadonlyArray<TextspecSelectionPoint['path'][number]>,
): boolean {
  return segments.every((segment) => typeof segment === 'number')
}

/**
 * Keep in sync with `resolveNodeContainer` in
 * `packages/editor/src/traversal/get-container-children.ts`: a matching
 * positional entry in the enclosing container's `of` decides, and a leaf
 * entry there stops the fallback to the top-level `containers`.
 */
function resolveContainer(
  position: TextspecPosition,
  matches: (type: string) => boolean,
): TextspecContainerRegistration | undefined {
  const positional = position.container?.of?.find((entry) =>
    matches(entry.type),
  )

  if (positional) {
    return positional.kind === 'container' ? positional : undefined
  }

  for (const [type, registration] of position.containers) {
    if (matches(type)) {
      return registration
    }
  }

  return undefined
}
