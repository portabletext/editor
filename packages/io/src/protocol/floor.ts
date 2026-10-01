import {set, type Patch} from '@portabletext/patches'
import type {Load} from './types'

/**
 * The floor: the shapes the editor cannot hold at all. A block is below it
 * when it isn't an object, has no `_key` or `_type`, is a text block
 * (`_type: 'block'`) whose `children` isn't a non-empty array of objects, or
 * is a text block with a span (`_type: 'span'`) whose `text` isn't a string.
 * Content Lake stores all of these.
 */
export function isBelowFloor(block: unknown): boolean {
  if (!isObject(block) || !hasName(block, '_key') || !hasName(block, '_type')) {
    return true
  }

  if (block['_type'] !== 'block') {
    return false
  }

  const children = block['children']

  return (
    !isNonEmptyArrayOfObjects(children) ||
    children.some(
      (child) => child['_type'] === 'span' && typeof child['text'] !== 'string',
    )
  )
}

/**
 * What the editor gets of a stored value: its blocks that are objects, and
 * for each of them, by the editor's position, its index in the stored
 * array.
 */
export function blocksForEditor<TBlock>(value: Array<TBlock>): {
  blocks: Array<TBlock>
  storedIndexes: Array<number>
} {
  const blocks: Array<TBlock> = []
  const storedIndexes: Array<number> = []

  for (const [storedIndex, block] of value.entries()) {
    if (isObject(block)) {
      blocks.push(block)
      storedIndexes.push(storedIndex)
    }
  }

  return {blocks, storedIndexes}
}

/**
 * The patches that bring a received whole value up to the floor and repair
 * its missing and duplicate keys, against the stored array, in block order.
 * A block that isn't an object gets none: the editor leaves it out, and
 * each other block is addressed by its index in the stored array when its
 * key is missing or repeats an earlier one, and by key otherwise, and so is
 * each child. The first of each duplicate key keeps it.
 *
 * A missing `_key` or one that repeats a sibling's gets a repair key (see
 * `mintRepairKey`), a missing `_type` becomes `'block'`, and a missing
 * `_type` on a text block's child `'span'`. A text block's `children` that
 * isn't a non-empty array of objects becomes one empty span with a repair
 * key, and a span `text` that isn't a string becomes `''`.
 */
export function repairToFloor({value, rev}: Load): Array<Patch> {
  const {blocks: storedBlocks, storedIndexes} = blocksForEditor(value ?? [])
  const blocks = storedBlocks.map(
    (block): Record<string, unknown> => ({...block}),
  )
  const patches: Array<Patch> = []
  const takenKeys = new Set(
    blocks.flatMap((block) => [
      ...nameOf(block, '_key'),
      ...objectsIn(block['children']).flatMap((child) => nameOf(child, '_key')),
    ]),
  )
  const blockKeys = new Set<string>()

  for (const [position, block] of blocks.entries()) {
    const storedIndex = storedIndexes[position]
    const [blockKey] = nameOf(block, '_key')
    let blockPath: Patch['path'] = [{_key: blockKey ?? ''}]

    if (blockKey === undefined || blockKeys.has(blockKey)) {
      blockPath = [storedIndex]
      patches.push(
        set(mintRepairKey(rev, [storedIndex], takenKeys), [
          storedIndex,
          '_key',
        ]),
      )
    } else {
      blockKeys.add(blockKey)
    }

    if (!hasName(block, '_type')) {
      patches.push(set('block', [...blockPath, '_type']))
    }

    if ((nameOf(block, '_type')[0] ?? 'block') !== 'block') {
      continue
    }

    const children = block['children']

    if (!isNonEmptyArrayOfObjects(children)) {
      patches.push(
        set(
          [
            {
              _type: 'span',
              _key: mintRepairKey(rev, [storedIndex, 'children', 0], takenKeys),
              text: '',
              marks: [],
            },
          ],
          [...blockPath, 'children'],
        ),
      )
      continue
    }

    patches.push(
      ...repairChildren({
        children,
        rev,
        storedPath: [storedIndex, 'children'],
        childrenPath: [...blockPath, 'children'],
        takenKeys,
      }),
    )
  }

  return patches
}

function repairChildren({
  children,
  rev,
  storedPath,
  childrenPath,
  takenKeys,
}: {
  children: Array<Record<string, unknown>>
  rev: string | undefined
  storedPath: Array<string | number>
  childrenPath: Patch['path']
  takenKeys: Set<string>
}): Array<Patch> {
  const patches: Array<Patch> = []
  const childKeys = new Set<string>()

  for (const [childIndex, child] of children.entries()) {
    const [childKey] = nameOf(child, '_key')
    let childPath: Patch['path'] = [...childrenPath, {_key: childKey ?? ''}]

    if (childKey === undefined || childKeys.has(childKey)) {
      childPath = [...childrenPath, childIndex]
      patches.push(
        set(mintRepairKey(rev, [...storedPath, childIndex], takenKeys), [
          ...childPath,
          '_key',
        ]),
      )
    } else {
      childKeys.add(childKey)
    }

    if (!hasName(child, '_type')) {
      patches.push(set('span', [...childPath, '_type']))
    }

    if (
      (nameOf(child, '_type')[0] ?? 'span') === 'span' &&
      typeof child['text'] !== 'string'
    ) {
      patches.push(set('', [...childPath, 'text']))
    }
  }

  return patches
}

/**
 * The key a repair gives the node at `path` in the value received at
 * `rev`: the 32-bit FNV-1a hash of `<rev>/<path segments joined by "/">`,
 * as eight hex digits, with `#<attempt>` appended to the input for each
 * attempt whose key is taken. An `undefined` revision hashes as the empty
 * string. Every editor that repairs the same defect of the same revision
 * mints the same key, so their repairs agree instead of racing. Marks the
 * key as taken.
 */
function mintRepairKey(
  rev: string | undefined,
  path: Array<string | number>,
  takenKeys: Set<string>,
): string {
  const input = [rev ?? '', ...path].join('/')
  let attempt = 0
  let key = fnv1a(input)

  while (takenKeys.has(key)) {
    attempt++
    key = fnv1a(`${input}#${attempt}`)
  }

  takenKeys.add(key)

  return key
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyArrayOfObjects(
  value: unknown,
): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && value.every(isObject)
}

function objectsIn(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isObject) : []
}

/** A non-empty string at `field`, as a list of zero or one. */
function nameOf(item: Record<string, unknown>, field: string): Array<string> {
  const name = item[field]

  return typeof name === 'string' && name !== '' ? [name] : []
}

function hasName(item: Record<string, unknown>, field: string): boolean {
  return nameOf(item, field).length > 0
}
