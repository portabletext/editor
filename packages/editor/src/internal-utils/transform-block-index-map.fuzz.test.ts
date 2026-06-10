import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers} from '../schema/resolve-containers-batch'
import type {KeyedSegment} from '../types/paths'
import {BlockIndexMap} from './block-index-map'
import {buildIndexMaps} from './build-index-maps'
import {safeStringify} from './safe-json'
import {transformBlockIndexMap} from './transform-block-index-map'

/**
 * Property-based check of the oracle invariant: a map maintained
 * incrementally through a random sequence of structural operations must
 * stay identical to a map built fresh from the value after every step.
 * Running the whole sequence against one incrementally-maintained map
 * also surfaces compounding errors a single-op test cannot.
 */

const fuzzSchema = compileSchema(
  defineSchema({
    blockObjects: [
      {
        name: 'table',
        fields: [
          {
            name: 'rows',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'row',
                fields: [
                  {
                    name: 'cells',
                    type: 'array',
                    of: [
                      {
                        type: 'object',
                        name: 'cell',
                        fields: [
                          {
                            name: 'content',
                            type: 'array',
                            of: [{type: 'block'}],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
)
const fuzzContainers = resolveContainers(fuzzSchema, [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    of: [
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        of: [defineContainer({type: 'cell', arrayField: 'content'})],
      }),
    ],
  }),
])

type FuzzNode = {_key: string; _type: string} & Record<string, unknown>

type Mutation = {
  op: EngineOperation
  afterValue: ReadonlyArray<FuzzNode>
}

describe('transformBlockIndexMap fuzz', () => {
  for (const seed of [1, 2, 3, 4]) {
    test(`random op sequence stays equivalent to a fresh rebuild (seed ${seed})`, () => {
      const random = mulberry32(seed)
      let keyCounter = 0
      const nextKey = () => `k${keyCounter++}`

      let value: ReadonlyArray<FuzzNode> = [
        createTextBlock(nextKey, 2),
        createTable(nextKey, random),
        createTextBlock(nextKey, 1),
      ]

      const incrementalMap = new BlockIndexMap()
      buildIndexMaps(
        {
          schema: fuzzSchema,
          value: value as unknown as PortableTextBlock[],
          containers: fuzzContainers,
        },
        {blockIndexMap: incrementalMap, listIndexMap: new Map()},
      )

      for (let step = 0; step < 150; step++) {
        const mutation = generateMutation(value, random, nextKey)
        transformBlockIndexMap(
          incrementalMap,
          mutation.op,
          value as never,
          mutation.afterValue as never,
          {schema: fuzzSchema, containers: fuzzContainers},
        )
        value = mutation.afterValue

        const oracleMap = new BlockIndexMap()
        buildIndexMaps(
          {
            schema: fuzzSchema,
            value: value as unknown as PortableTextBlock[],
            containers: fuzzContainers,
          },
          {blockIndexMap: oracleMap, listIndexMap: new Map()},
        )

        expect(
          Object.fromEntries([...incrementalMap].sort()),
          `seed ${seed}, step ${step}, op ${safeStringify(mutation.op)}`,
        ).toEqual(Object.fromEntries([...oracleMap].sort()))
      }
    })
  }
})

function generateMutation(
  value: ReadonlyArray<FuzzNode>,
  random: () => number,
  nextKey: () => string,
): Mutation {
  const arrays = collectArrays(value)
  // Retry until an applicable mutation comes up; insert into the root
  // array is always applicable, so this terminates.
  while (true) {
    const choice = Math.floor(random() * 7)
    if (choice === 0) {
      return insertNode(value, arrays, random, nextKey)
    }
    if (choice === 1) {
      const mutation = removeNode(value, arrays, random)
      if (mutation) {
        return mutation
      }
      continue
    }
    if (choice === 2) {
      const mutation = replaceNode(value, arrays, random, nextKey)
      if (mutation) {
        return mutation
      }
      continue
    }
    if (choice === 3) {
      const mutation = renameNodeKey(value, arrays, random, nextKey)
      if (mutation) {
        return mutation
      }
      continue
    }
    if (choice === 4) {
      const mutation = setContainerProperty(value, arrays, random, nextKey)
      if (mutation) {
        return mutation
      }
      continue
    }
    if (choice === 5) {
      const mutation = unsetContainerProperty(value, arrays, random)
      if (mutation) {
        return mutation
      }
      continue
    }
    return insertNode(value, arrays, random, nextKey)
  }
}

type CandidateArray = {
  // Path to the array itself: alternating keyed/field segments, ending
  // in a field name, or `[]` for the root array.
  arrayPath: Path
  entries: ReadonlyArray<FuzzNode>
  kind: 'root' | 'children' | 'markDefs' | 'rows' | 'cells' | 'content'
}

function collectArrays(value: ReadonlyArray<FuzzNode>): Array<CandidateArray> {
  const candidates: Array<CandidateArray> = [
    {arrayPath: [], entries: value, kind: 'root'},
  ]
  const visitNode = (node: FuzzNode, nodePath: Path) => {
    const fieldKinds: Array<CandidateArray['kind']> =
      node._type === 'block'
        ? ['children', 'markDefs']
        : node._type === 'table'
          ? ['rows']
          : node._type === 'row'
            ? ['cells']
            : node._type === 'cell'
              ? ['content']
              : []
    for (const fieldKind of fieldKinds) {
      const entries = node[fieldKind]
      if (!Array.isArray(entries)) {
        continue
      }
      const arrayPath: Path = [...nodePath, fieldKind]
      candidates.push({
        arrayPath,
        entries: entries as ReadonlyArray<FuzzNode>,
        kind: fieldKind,
      })
      for (const child of entries as ReadonlyArray<FuzzNode>) {
        visitNode(child, [...arrayPath, {_key: child._key}])
      }
    }
  }
  for (const block of value) {
    visitNode(block, [{_key: block._key}])
  }
  return candidates
}

function insertNode(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
  nextKey: () => string,
): Mutation {
  const target = pick(arrays, random)
  const node = createEntry(target.kind, nextKey, random)
  const insertIndex = Math.floor(random() * (target.entries.length + 1))
  let path: Path
  let position: 'before' | 'after'
  if (target.entries.length > 0 && random() < 0.5) {
    // Anchor on an existing keyed sibling.
    if (insertIndex === 0) {
      path = [...target.arrayPath, {_key: target.entries[0]!._key}]
      position = 'before'
    } else {
      path = [
        ...target.arrayPath,
        {_key: target.entries[insertIndex - 1]!._key},
      ]
      position = 'after'
    }
  } else {
    path = [...target.arrayPath, insertIndex]
    position = 'before'
  }
  const afterValue = updateArrayAtPath(value, target.arrayPath, (entries) => [
    ...entries.slice(0, insertIndex),
    node,
    ...entries.slice(insertIndex),
  ])
  return {
    op: {type: 'insert', path, node: node as never, position},
    afterValue,
  }
}

function removeNode(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
): Mutation | undefined {
  const target = pickNonEmpty(arrays, random)
  if (!target) {
    return undefined
  }
  const removeIndex = Math.floor(random() * target.entries.length)
  const path: Path =
    random() < 0.5
      ? [...target.arrayPath, {_key: target.entries[removeIndex]!._key}]
      : [...target.arrayPath, removeIndex]
  const afterValue = updateArrayAtPath(value, target.arrayPath, (entries) =>
    entries.filter((_, index) => index !== removeIndex),
  )
  return {op: {type: 'unset', path}, afterValue}
}

function replaceNode(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
  nextKey: () => string,
): Mutation | undefined {
  const target = pickNonEmpty(arrays, random)
  if (!target) {
    return undefined
  }
  const replaceIndex = Math.floor(random() * target.entries.length)
  const oldNode = target.entries[replaceIndex]!
  const newNode = createEntry(target.kind, nextKey, random)
  const replacement =
    // Half the time keep the old `_key` so both same-key and
    // key-changing full-node sets are exercised.
    random() < 0.5 ? {...newNode, _key: oldNode._key} : newNode
  const path: Path =
    random() < 0.5
      ? [...target.arrayPath, {_key: oldNode._key}]
      : [...target.arrayPath, replaceIndex]
  const afterValue = updateArrayAtPath(value, target.arrayPath, (entries) =>
    entries.map((entry, index) =>
      index === replaceIndex ? replacement : entry,
    ),
  )
  return {
    op: {type: 'set', path, value: replacement},
    afterValue,
  }
}

function renameNodeKey(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
  nextKey: () => string,
): Mutation | undefined {
  const target = pickNonEmpty(arrays, random)
  if (!target) {
    return undefined
  }
  const renameIndex = Math.floor(random() * target.entries.length)
  const oldNode = target.entries[renameIndex]!
  const newKey = nextKey()
  const path: Path =
    random() < 0.5
      ? [...target.arrayPath, {_key: oldNode._key}, '_key']
      : [...target.arrayPath, renameIndex, '_key']
  const afterValue = updateArrayAtPath(value, target.arrayPath, (entries) =>
    entries.map((entry, index) =>
      index === renameIndex ? {...entry, _key: newKey} : entry,
    ),
  )
  return {op: {type: 'set', path, value: newKey}, afterValue}
}

function setContainerProperty(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
  nextKey: () => string,
): Mutation | undefined {
  const nested = arrays.filter((candidate) => candidate.arrayPath.length > 0)
  if (nested.length === 0) {
    return undefined
  }
  const target = pick(nested, random)
  const entryCount = Math.floor(random() * 3)
  const newEntries = Array.from({length: entryCount}, () =>
    createEntry(target.kind, nextKey, random),
  )
  const afterValue = updateArrayAtPath(
    value,
    target.arrayPath,
    () => newEntries,
  )
  return {
    op: {type: 'set', path: target.arrayPath, value: newEntries},
    afterValue,
  }
}

function unsetContainerProperty(
  value: ReadonlyArray<FuzzNode>,
  arrays: Array<CandidateArray>,
  random: () => number,
): Mutation | undefined {
  const nested = arrays.filter((candidate) => candidate.arrayPath.length > 0)
  if (nested.length === 0) {
    return undefined
  }
  const target = pick(nested, random)
  const ownerPath = target.arrayPath.slice(0, -1)
  const fieldName = target.arrayPath[target.arrayPath.length - 1] as string
  const afterValue = updateNodeAtPath(value, ownerPath, (node) => {
    const updated = {...node}
    delete updated[fieldName]
    return updated
  })
  return {op: {type: 'unset', path: target.arrayPath}, afterValue}
}

function createEntry(
  kind: CandidateArray['kind'],
  nextKey: () => string,
  random: () => number,
): FuzzNode {
  switch (kind) {
    case 'root':
      return random() < 0.5
        ? createTextBlock(nextKey, Math.floor(random() * 3))
        : createTable(nextKey, random)
    case 'children':
      return createSpan(nextKey())
    case 'markDefs':
      return {_key: nextKey(), _type: 'link', href: '#'}
    case 'rows':
      return createRow(nextKey, random)
    case 'cells':
      return createCell(nextKey, random)
    case 'content':
      return createTextBlock(nextKey, Math.floor(random() * 2))
  }
}

function createSpan(key: string): FuzzNode {
  return {_key: key, _type: 'span', text: `text-${key}`, marks: []}
}

function createTextBlock(nextKey: () => string, spanCount: number): FuzzNode {
  return {
    _key: nextKey(),
    _type: 'block',
    children: Array.from({length: spanCount}, () => createSpan(nextKey())),
    markDefs: [],
  }
}

function createCell(nextKey: () => string, random: () => number): FuzzNode {
  return {
    _key: nextKey(),
    _type: 'cell',
    content: Array.from({length: Math.floor(random() * 2)}, () =>
      createTextBlock(nextKey, 1),
    ),
  }
}

function createRow(nextKey: () => string, random: () => number): FuzzNode {
  return {
    _key: nextKey(),
    _type: 'row',
    cells: Array.from({length: Math.floor(random() * 3)}, () =>
      createCell(nextKey, random),
    ),
  }
}

function createTable(nextKey: () => string, random: () => number): FuzzNode {
  return {
    _key: nextKey(),
    _type: 'table',
    rows: Array.from({length: 1 + Math.floor(random() * 2)}, () =>
      createRow(nextKey, random),
    ),
  }
}

/**
 * Immutably update the array at `arrayPath`, alternating keyed/field
 * segments ending in a field name, or `[]` for the root array.
 */
function updateArrayAtPath(
  entries: ReadonlyArray<FuzzNode>,
  arrayPath: Path,
  update: (entries: ReadonlyArray<FuzzNode>) => ReadonlyArray<FuzzNode>,
): ReadonlyArray<FuzzNode> {
  if (arrayPath.length === 0) {
    return update(entries)
  }
  const keySegment = arrayPath[0] as KeyedSegment
  const fieldName = arrayPath[1] as string
  return entries.map((node) => {
    if (node._key !== keySegment._key) {
      return node
    }
    const fieldEntries = (node[fieldName] ?? []) as ReadonlyArray<FuzzNode>
    return {
      ...node,
      [fieldName]: updateArrayAtPath(fieldEntries, arrayPath.slice(2), update),
    }
  })
}

/**
 * Immutably update the node at `nodePath` (alternating keyed/field
 * segments ending in a keyed segment).
 */
function updateNodeAtPath(
  value: ReadonlyArray<FuzzNode>,
  nodePath: Path,
  transform: (node: FuzzNode) => FuzzNode,
): ReadonlyArray<FuzzNode> {
  const keySegment = nodePath[nodePath.length - 1] as KeyedSegment
  return updateArrayAtPath(value, nodePath.slice(0, -1), (entries) =>
    entries.map((node) =>
      node._key === keySegment._key ? transform(node) : node,
    ),
  )
}

function pick<Candidate>(
  candidates: ReadonlyArray<Candidate>,
  random: () => number,
): Candidate {
  return candidates[Math.floor(random() * candidates.length)]!
}

function pickNonEmpty(
  arrays: Array<CandidateArray>,
  random: () => number,
): CandidateArray | undefined {
  const nonEmpty = arrays.filter((candidate) => candidate.entries.length > 0)
  if (nonEmpty.length === 0) {
    return undefined
  }
  return pick(nonEmpty, random)
}

/**
 * Deterministic seeded PRNG so failures reproduce.
 */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}
