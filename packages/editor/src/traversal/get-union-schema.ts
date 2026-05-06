import {getSubSchema, type Schema} from '@portabletext/schema'
import type {Containers} from '../schema/resolve-containers'

/**
 * Return a `Schema` that contains every named member declared anywhere
 * in the editor's schema graph that is reachable from a position where text
 * is edited - the root schema merged with the sub-schema of every registered
 * container whose field accepts text blocks, deduped by name. Useful for
 * rendering a static toolbar whose buttons stay stable across selection
 * moves while still reflecting everything that could plausibly be edited or
 * inserted somewhere.
 *
 * Containers whose field does NOT accept text blocks (e.g. a `table`
 * container whose `rows` field only accepts `row` objects, or a `row`
 * container whose `cells` field only accepts `cell` objects) are
 * **structural**: their immediate `of` types are organizational, not
 * insertable user content. Those structural types are excluded from the
 * union. Their nested text-block-accepting descendants (e.g. a `cell`
 * that contains a `content` field of `{type: 'block'}`) are reached via
 * those descendants' own container registration.
 *
 * Pair with `getPathSubSchema` (or a path-based intersection across a
 * range) to determine which of the union's members are applicable at the
 * current selection.
 *
 * @beta
 */
export function getUnionSchema(schema: Schema, containers: Containers): Schema {
  const decorators = mergeByName(schema.decorators, [])
  const annotations = mergeByName(schema.annotations, [])
  const lists = mergeByName(schema.lists, [])
  const styles = mergeByName(schema.styles, [])
  const inlineObjects = mergeByName(schema.inlineObjects, [])
  const blockObjects = mergeByName(schema.blockObjects, [])

  for (const container of containers.values()) {
    if (!acceptsTextBlock(container.field.of, schema.block.name)) {
      continue
    }
    const sub = getSubSchema(schema, container.field.of)
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
