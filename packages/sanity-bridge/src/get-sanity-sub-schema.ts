import {
  isArraySchemaType,
  isKeySegment,
  type ArraySchemaType,
  type Path,
  type PortableTextBlock,
  type SchemaType,
} from '@sanity/types'
import {
  createPortableTextMemberSchemaTypesFromOf,
  type PortableTextMemberSchemaTypes,
} from './portable-text-member-schema-types'

/**
 * Resolve the {@link PortableTextMemberSchemaTypes} view at `path`
 * against `value`. Walks `path` to find the nearest Portable-Text-
 * shaped ancestor — a container's child array, or the root — and
 * bucketizes its `of` declaration into the same shape as
 * {@link createPortableTextMemberSchemaTypes}.
 *
 * Sanity-side counterpart to `@portabletext/schema`'s `getSubSchema`,
 * composed with the same walk that PTE's `getPathSubSchema` performs.
 * The two functions answer the same question — "what's the schema
 * here?" — in their respective type universes: `@portabletext/schema`
 * operates over the PTE `Schema` shape; this one over Sanity's
 * `SchemaType`. Same algorithm, different inputs.
 *
 * The walk is structured against the raw Sanity `ArraySchemaType` and
 * value tree directly, without consulting PTE's runtime `Containers`
 * map, so it can run from anywhere a Studio integration sits.
 *
 * A "Portable-Text-shaped" `of` is an array declaration that includes
 * a `{type: 'block'}` member. Text blocks' `children` field carries a
 * span-content `of` (no block member) and is not Portable-Text-shaped;
 * descending into it would not yield a `PortableTextMemberSchemaTypes`
 * view. The walk therefore tracks the deepest PT-shaped `of` it has
 * traversed and returns its bucketization. When `path` traverses no
 * containers (or is empty), returns the root bucketization.
 *
 * Falls back to the root bucketization when:
 * - `path` traverses only text blocks and their span children,
 * - any segment along the walk can't be resolved against the value, or
 * - any member along the walk has no child array field.
 *
 * @public
 */
export function getSanitySubSchema(
  rootPortableTextType: ArraySchemaType<PortableTextBlock>,
  value: ReadonlyArray<PortableTextBlock>,
  path: Path,
): PortableTextMemberSchemaTypes {
  const enclosingOf = resolveEnclosingOf(rootPortableTextType, value, path)
  return createPortableTextMemberSchemaTypesFromOf(
    rootPortableTextType,
    enclosingOf ?? rootPortableTextType.of ?? [],
  )
}

/**
 * Walk `path` and return the deepest Portable-Text-shaped `of`
 * traversed (the `of` of the nearest container ancestor). Returns
 * `undefined` when the walk traverses no containers — the root `of`
 * is the answer.
 */
function resolveEnclosingOf(
  rootPortableTextType: ArraySchemaType<PortableTextBlock>,
  value: ReadonlyArray<PortableTextBlock>,
  path: Path,
): ReadonlyArray<SchemaType> | undefined {
  const parentKeyedIndex = findParentKeyedIndex(path)
  if (parentKeyedIndex < 0) {
    return undefined
  }

  let currentOf: ReadonlyArray<SchemaType> = rootPortableTextType.of ?? []
  let currentChildren: ReadonlyArray<PortableTextBlock> = value
  let containerOf: ReadonlyArray<SchemaType> | undefined

  for (let segmentIndex = 0; segmentIndex <= parentKeyedIndex; segmentIndex++) {
    const segment = path[segmentIndex]!
    if (typeof segment === 'string') {
      continue
    }

    let childNode: PortableTextBlock | undefined
    if (isKeySegment(segment)) {
      childNode = currentChildren.find((child) => child._key === segment._key)
    } else if (typeof segment === 'number') {
      childNode = currentChildren.at(segment)
    } else {
      return containerOf
    }
    if (!childNode) {
      return containerOf
    }

    const member = currentOf.find((entry) => entry.name === childNode._type)
    if (!member) {
      return containerOf
    }

    const childField = findChildArrayField(member)
    if (!childField) {
      // Terminal member (no editable children).
      return containerOf
    }

    const nextOf = safeGetOf(childField.type) ?? []
    if (isPortableTextShaped(nextOf)) {
      containerOf = nextOf
    }
    currentOf = nextOf
    const rawChildren = (childNode as Record<string, unknown>)[childField.name]
    currentChildren = Array.isArray(rawChildren)
      ? (rawChildren as ReadonlyArray<PortableTextBlock>)
      : []
  }

  return containerOf
}

/**
 * A Portable-Text-shaped `of` carries a member whose root type name
 * is `'block'` — the same membership test
 * {@link createPortableTextMemberSchemaTypesFromOf} uses to find the
 * block type. Span-content arrays (text block `children.of`) don't
 * qualify because their members are spans, not blocks.
 */
function isPortableTextShaped(of: ReadonlyArray<SchemaType>): boolean {
  return of.some((entry) => walkToRoot(entry).name === 'block')
}

function walkToRoot(type: SchemaType): SchemaType {
  return type.type ? walkToRoot(type.type) : type
}

/**
 * Locate the parent of the target node in `path`. The result is the
 * index of the last-but-one keyed segment. When `path` has only one
 * keyed segment, the parent is the root (returns `-1`).
 */
function findParentKeyedIndex(path: Path): number {
  let lastKeyedIndex = -1
  let parentKeyedIndex = -1
  for (let index = 0; index < path.length; index++) {
    const segment = path[index]
    if (segment !== undefined && isKeySegment(segment)) {
      parentKeyedIndex = lastKeyedIndex
      lastKeyedIndex = index
    }
  }
  return parentKeyedIndex
}

/**
 * Find the (single) array field on a member type. Text blocks carry
 * `children`; block-objects carry their own array field by
 * construction. Other field types (string `style`, string `listItem`,
 * object `markDefs`, etc.) are skipped. Members without a `fields`
 * array (string members, primitive type aliases) yield `undefined`.
 */
function findChildArrayField(
  member: SchemaType,
): {name: string; type: ArraySchemaType} | undefined {
  const fields = (
    member as {fields?: ReadonlyArray<{name: string; type: SchemaType}>}
  ).fields
  if (!fields) {
    return undefined
  }
  for (const field of fields) {
    if (isArraySchemaType(field.type)) {
      return {name: field.name, type: field.type}
    }
  }
  return undefined
}

/**
 * Read the `of` array off a Sanity `SchemaType` if it carries one.
 * Mirrors the local helper in `sanity-schema-to-portable-text-schema.ts`.
 * Sanity schema getters can throw on partially-compiled types; the
 * try/catch keeps the walk robust at edges.
 */
function safeGetOf(
  schemaType: SchemaType,
): ReadonlyArray<SchemaType> | undefined {
  try {
    if (schemaType.jsonType === 'array') {
      const arrayOf = (schemaType as ArraySchemaType).of
      return Array.isArray(arrayOf) ? arrayOf : undefined
    }
  } catch {
    // Sanity schema getters can throw — ignore
  }
  return undefined
}
