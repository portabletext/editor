import {getSubSchema, type Schema} from '@portabletext/schema'
import type {
  Containers,
  RegisteredContainer,
  RegisteredPositional,
} from '../schema/resolve-containers'

/**
 * Return a `Schema` that contains every named member declared anywhere
 * in the editor's schema graph that is reachable from a position where text
 * is edited - the root schema merged with the sub-schema of every registered
 * container whose field accepts text blocks, deduped by name. Containers
 * registered in another container's `of` count at any depth, so a table
 * `cell` registered under `row` under `table` contributes its members.
 * When two sources declare the same name, the first one wins: the root
 * schema, then top-level containers in registration order, then nested
 * containers one depth level at a time. Nested containers only add names
 * that no shallower source declares.
 *
 * Useful for rendering a static toolbar whose buttons stay stable across
 * selection moves while still reflecting everything that could plausibly be
 * edited or inserted somewhere.
 *
 * Containers whose field does NOT accept text blocks (e.g. a `table`
 * container whose `rows` field only accepts `row` objects, or a `row`
 * container whose `cells` field only accepts `cell` objects) are
 * **structural**: their immediate `of` types are organizational, not
 * insertable user content. Those structural types are excluded from the
 * union. Their text-block-accepting descendants (e.g. a `cell` that
 * contains a `content` field of `{type: 'block'}`) still contribute when
 * they are registered, either at the top level or nested in the structural
 * container's `of`.
 *
 * Pair with `getPathSubSchema` (or a path-based intersection across a
 * range) to determine which of the union's members are applicable at the
 * current selection.
 *
 * @public
 */
export function getUnionSchema(schema: Schema, containers: Containers): Schema {
  const decorators = mergeByName(schema.decorators, [])
  const annotations = mergeByName(schema.annotations, [])
  const lists = mergeByName(schema.lists, [])
  const styles = mergeByName(schema.styles, [])
  const inlineObjects = mergeByName(schema.inlineObjects, [])
  const blockObjects = mergeByName(schema.blockObjects, [])

  for (const field of getTextBlockFields(
    containers.values(),
    schema.block.name,
  )) {
    const sub = getSubSchema(schema, field.of)
    mergeByName(sub.decorators, decorators)
    mergeByName(sub.annotations, annotations)
    mergeByName(sub.lists, lists)
    mergeByName(sub.styles, styles)
    mergeByName(sub.inlineObjects, inlineObjects)
    mergeByName(sub.blockObjects, blockObjects)
  }

  return {
    ...schema,
    decorators,
    annotations,
    lists,
    styles,
    inlineObjects,
    blockObjects,
  }
}

function* getTextBlockFields(
  containers: Iterable<RegisteredContainer>,
  blockName: string,
): Generator<RegisteredContainer['field']> {
  let level: Array<RegisteredContainer | RegisteredPositional> =
    Array.from(containers)
  while (level.length > 0) {
    const nextLevel: Array<RegisteredContainer | RegisteredPositional> = []
    for (const entry of level) {
      if (!('field' in entry)) {
        continue
      }
      if (acceptsTextBlock(entry.field.of, blockName)) {
        yield entry.field
      }
      if (entry.of) {
        nextLevel.push(...entry.of)
      }
    }
    level = nextLevel
  }
}

function acceptsTextBlock(
  of: ReadonlyArray<{type: string}>,
  blockName: string,
): boolean {
  return of.some(
    (member) => member.type === 'block' || member.type === blockName,
  )
}

function mergeByName<T extends {name: string}>(
  source: ReadonlyArray<T>,
  target: Array<T>,
): Array<T> {
  for (const entry of source) {
    if (target.some((existing) => existing.name === entry.name)) {
      continue
    }
    target.push(entry)
  }
  return target
}
