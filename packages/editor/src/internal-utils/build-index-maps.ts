import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import type {RegisteredContainer} from '../schema/container-types'
import {getNodeChildren} from '../traversal/get-children'
import type {KeyedSegment} from '../types/paths'

/**
 * Mutates `blockIndexMap` in place. Used for initial engine population and
 * tests. During operation application the map is maintained incrementally
 * by `transform-block-index-map` helpers.
 */
export function buildIndexMaps(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  {
    blockIndexMap,
  }: {
    blockIndexMap: Map<string, number>
  },
): void {
  blockIndexMap.clear()
  for (let blockIndex = 0; blockIndex < context.value.length; blockIndex++) {
    const block = context.value.at(blockIndex)
    if (block === undefined || block._key === undefined) {
      // Unkeyed transient blocks (e.g. inserted by a remote patch before
      // normalization assigns a `_key`) cannot be addressed by keyed path,
      // so they are not indexed, mirroring `collectDescendantIndexes`.
      continue
    }
    const blockSegment: KeyedSegment = {_key: block._key}
    const blockPath: Path = [blockSegment]
    const blockKey = serializePath(blockPath)
    if (!blockIndexMap.has(blockKey)) {
      blockIndexMap.set(blockKey, blockIndex)
    }
    collectDescendantIndexes(
      context,
      block,
      blockPath,
      undefined,
      blockIndexMap,
    )
  }
}

export function collectDescendantIndexes(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  node: Node,
  nodePath: Path,
  parent: RegisteredContainer | undefined,
  blockIndexMap: Map<string, number>,
): void {
  const result = getNodeChildren(context, node, parent)
  if (!result) {
    return
  }

  for (let i = 0; i < result.children.length; i++) {
    const child = result.children[i]!
    if (!child._key) {
      continue
    }

    const childSegment: KeyedSegment = {_key: child._key}
    const childPath: Path = [...nodePath, result.fieldName, childSegment]
    const childKey = serializePath(childPath)
    if (!blockIndexMap.has(childKey)) {
      blockIndexMap.set(childKey, i)
    }

    collectDescendantIndexes(
      context,
      child,
      childPath,
      result.parent,
      blockIndexMap,
    )
  }
}

// Build a complete `EditorSnapshot` for tests. Populates
// `blockIndexMap` via `buildIndexMaps` so consumers
// can assume the invariant that production maintains.
export function createTestSnapshot(input: {
  value: Array<PortableTextBlock>
  schema: EditorContext['schema']
  containers?: EditorContext['containers']
  selection?: EditorContext['selection']
}): EditorSnapshot {
  const blockIndexMap = new Map<string, number>()
  const containers = input.containers ?? new Map()
  buildIndexMaps(
    {schema: input.schema, value: input.value, containers},
    {blockIndexMap},
  )
  return {
    context: {
      containers,
      converters: [],
      keyGenerator: () => '',
      readOnly: false,
      schema: input.schema,
      selection: input.selection ?? null,
      value: input.value,
    },
    blockIndexMap,
    decoratorState: {},
  }
}
