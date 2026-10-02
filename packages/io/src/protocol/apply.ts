import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyWithContentLakeSemantics} from './content-lake'
import {blocksForEditor, isObject} from './floor'
import {childrenOf, findBlock, isEqual, itemKey, keyOf} from './nodes'

/**
 * The instructions that take the editor's tree from `shown` to `wanted` for
 * other writers' `patches`, given the `unlanded` work the editor had on top
 * of the base, decided per list (the block list, or a block's `children`).
 * A list is lined up against `wanted` key by key when the patches insert
 * into it, remove from it or change a key in it while unlanded work touched
 * it (changed its items or anything in them), and whenever the patches
 * change a key in it: none of the patches on that list is forwarded, since
 * a later patch can depend on an earlier one (an insert after a new key, a
 * block removed and inserted again elsewhere). A patch on the whole field,
 * or by index, while there is unlanded work lines up the block list.
 *
 * On a list that isn't lined up, a patch on a place no unlanded patch
 * touched is forwarded as it is, and a patch on a block unlanded work
 * touched becomes a `set` of the block from `wanted` (or an `unset` when
 * `wanted` lost it), since the server applied the editor's work after the
 * patch and the screen applied it before.
 *
 * With no unlanded work, a patch addressed by index in `stored`, the base
 * the patches apply to, is addressed to the editor's block first (see
 * `addressForEditor`), since the editor leaves out the stored blocks that
 * aren't objects.
 *
 * The forwarded patches go first: they touch nothing the rest lines up, and
 * a forwarded patch into a block a later instruction inserts does nothing,
 * as the block arrives from `wanted` with it applied.
 */
export function authorInstructions({
  stored,
  shown,
  wanted,
  patches,
  unlanded,
}: {
  stored: Array<PortableTextBlock> | undefined
  shown: Array<PortableTextBlock> | undefined
  wanted: Array<PortableTextBlock> | undefined
  patches: Array<Patch>
  unlanded: Array<Patch>
}): Array<Patch> {
  const addressed =
    unlanded.length === 0 ? addressForEditor(patches, stored) : patches

  if (addressed === undefined) {
    return lineUpList(shown ?? [], wanted ?? [], [])
  }

  const touched = touchedPlaces(unlanded)
  const places = addressed.map((patch) => ({patch, place: placeOf(patch)}))
  const lineUpBlockList = places.some(
    ({place}) =>
      (place.type === 'field' && unlanded.length > 0) ||
      (place.type === 'block list' &&
        (place.change === 'key' ||
          (place.change === 'membership' && touched.blockList))),
  )
  const linedUpChildLists = new Set(
    places.flatMap(({place}) =>
      place.type === 'child list' &&
      (place.change === 'key' ||
        (place.change === 'membership' &&
          touched.childLists.has(place.blockKey)))
        ? [place.blockKey]
        : [],
    ),
  )
  const forwarded: Array<Patch> = []
  const conflictingBlocks = new Set<string>()

  for (const {patch, place} of places) {
    if (place.type === 'field' || touched.field) {
      if (unlanded.length === 0) {
        forwarded.push(patch)
      }
    } else if (place.type === 'block list' && lineUpBlockList) {
      continue
    } else if (
      place.type === 'child list' &&
      linedUpChildLists.has(place.blockKey)
    ) {
      continue
    } else if (touched.blocks.has(place.blockKey)) {
      conflictingBlocks.add(place.blockKey)
    } else {
      forwarded.push(patch)
    }
  }

  const current = applyWithContentLakeSemantics(shown, forwarded) ?? []
  const target = wanted ?? []

  if (lineUpBlockList || touched.field) {
    return [...forwarded, ...lineUpList(current, target, [])]
  }

  const fixes: Array<Patch> = []

  for (const blockKey of new Set([
    ...conflictingBlocks,
    ...linedUpChildLists,
  ])) {
    const shownBlock = findBlock(current, blockKey)
    const wantedBlock = findBlock(target, blockKey)

    if (wantedBlock === undefined) {
      fixes.push(...(shownBlock ? [unset([{_key: blockKey}])] : []))
    } else if (shownBlock === undefined) {
      return [...forwarded, ...lineUpList(current, target, [])]
    } else if (
      !conflictingBlocks.has(blockKey) &&
      isEqual(
        {...shownBlock, children: undefined},
        {...wantedBlock, children: undefined},
      )
    ) {
      fixes.push(
        ...lineUpList(childrenOf(shownBlock), childrenOf(wantedBlock), [
          {_key: blockKey},
          'children',
        ]),
      )
    } else if (!isEqual(shownBlock, wantedBlock)) {
      fixes.push(set(wantedBlock, [{_key: blockKey}]))
    }
  }

  return [...forwarded, ...fixes]
}

/**
 * `patches` with each path that starts with an index in the stored array,
 * taken patch by patch from `stored`, addressed to that block in the
 * editor instead: by its key, or else by its position among the blocks
 * that are objects. `undefined` when a patch by index targets no block
 * that is an object, or brings a block that isn't one.
 */
function addressForEditor(
  patches: Array<Patch>,
  stored: Array<PortableTextBlock> | undefined,
): Array<Patch> | undefined {
  const addressed: Array<Patch> = []
  let value = stored

  for (const patch of patches) {
    const [head, ...tail] = patch.path

    if (typeof head === 'number') {
      const storedBlocks = value ?? []
      const {blocks, storedIndexes} = blocksForEditor(storedBlocks)
      const position = storedIndexes.indexOf(
        head < 0 ? storedBlocks.length + head : head,
      )

      if (position === -1 || bringsNonObjectBlock(patch)) {
        return undefined
      }

      const [key] = itemKey(blocks[position])

      addressed.push({
        ...patch,
        path: [key === undefined ? position : {_key: key}, ...tail],
      })
    } else {
      addressed.push(patch)
    }

    value = applyWithContentLakeSemantics(value, [patch])
  }

  return addressed
}

function bringsNonObjectBlock(patch: Patch): boolean {
  if (patch.path.length !== 1) {
    return false
  }

  if (patch.type === 'insert') {
    return patch.items.some((item) => !isObject(item))
  }

  return patch.type === 'set' && !isObject(patch.value)
}

/**
 * Where a patch acts: the whole `field` (a path that is empty or starts
 * with an index), the `block list` (a block, or a field of a block outside
 * its keyed children), or the `child list` of `blockKey` (a keyed child, or
 * anything under one). `change` says whether the patch changes the list's
 * `membership` (an insert into it, or an `unset` of one of its items) or
 * an item's `key` (a patch on its `_key`, or a `set` of the item whose
 * value has another `_key`).
 */
function placeOf(
  patch: Patch,
):
  | {type: 'field'}
  | {type: 'block list'; blockKey: string; change: ListChange}
  | {type: 'child list'; blockKey: string; change: ListChange} {
  const [head, field, childSegment] = patch.path
  const blockKey = keyOf(head)

  if (blockKey === undefined) {
    return {type: 'field'}
  }

  const childKey = field === 'children' ? keyOf(childSegment) : undefined

  if (childKey === undefined) {
    return {
      type: 'block list',
      blockKey,
      change: listChangeOf(patch, 1, blockKey),
    }
  }

  return {
    type: 'child list',
    blockKey,
    change: listChangeOf(patch, 3, childKey),
  }
}

type ListChange = 'membership' | 'key' | undefined

/**
 * What a patch does to the list whose item is at `itemDepth` in its path,
 * the item keyed `key`.
 */
function listChangeOf(
  patch: Patch,
  itemDepth: number,
  key: string,
): ListChange {
  const {path} = patch

  if (
    path.length === itemDepth &&
    (patch.type === 'insert' || patch.type === 'unset')
  ) {
    return 'membership'
  }

  if (path.length === itemDepth + 1 && path[itemDepth] === '_key') {
    return 'key'
  }

  if (
    path.length === itemDepth &&
    patch.type === 'set' &&
    key !== itemKey(patch.value)[0]
  ) {
    return 'key'
  }

  return undefined
}

/**
 * The places unlanded work touched: the whole `field`; the block list, by
 * any patch on or under a block; the `children` lists, by any patch on or
 * under one of their children; and the blocks it acted on or under for
 * anything but their removal. A patch under a removed block finds nothing
 * on either side.
 */
function touchedPlaces(unlanded: Array<Patch>): {
  field: boolean
  blockList: boolean
  childLists: Set<string>
  blocks: Set<string>
} {
  const touched = {
    field: false,
    blockList: false,
    childLists: new Set<string>(),
    blocks: new Set<string>(),
  }

  for (const patch of unlanded) {
    const place = placeOf(patch)

    if (place.type === 'field') {
      touched.field = true
      continue
    }

    touched.blockList = true

    if (place.type === 'child list') {
      touched.childLists.add(place.blockKey)
    }

    if (place.type === 'child list' || place.change !== 'membership') {
      touched.blocks.add(place.blockKey)
    }
  }

  return touched
}

/**
 * Keyed instructions that line `shown` up with `wanted`, the list at
 * `listPath`: the longest run of keys in the same order on both sides stays,
 * every other shown item is removed, every other wanted item is inserted
 * next to a keyed sibling that is there by then, and an item that stays but
 * differs is `set`. A list with a missing or repeated key gets a `set` of the
 * whole list, and an empty one gets its items by index.
 */
export function lineUpList(
  shown: Array<unknown>,
  wanted: Array<unknown>,
  listPath: Patch['path'],
): Array<Patch> {
  const shownKeys = shown.map((item) => itemKey(item)[0])
  const wantedKeys = wanted.map((item) => itemKey(item)[0])

  if (!hasUniqueKeys(shownKeys) || !hasUniqueKeys(wantedKeys)) {
    return [set(wanted, listPath)]
  }

  if (shown.length === 0) {
    return wanted.length === 0
      ? []
      : [setIfMissing([], listPath), insert(wanted, 'before', [...listPath, 0])]
  }

  const stays = new Set(longestCommonRun(shownKeys, wantedKeys))
  const itemPath = (key: string) => [...listPath, {_key: key}]
  const firstStaying = wantedKeys.find((key) => stays.has(key))

  if (firstStaying === undefined) {
    return [
      ...(wanted.length > 0
        ? [insert(wanted, 'before', itemPath(shownKeys[0]))]
        : []),
      ...shownKeys.map((key) => unset(itemPath(key))),
    ]
  }

  const removals = shownKeys
    .filter((key) => !stays.has(key))
    .map((key) => unset(itemPath(key)))
  const inserts = wanted.flatMap((item, index) => {
    if (stays.has(wantedKeys[index])) {
      return []
    }

    const previousKey = wantedKeys[index - 1]

    return previousKey === undefined
      ? [insert([item], 'before', itemPath(firstStaying))]
      : [insert([item], 'after', itemPath(previousKey))]
  })
  const sets = wanted.flatMap((item, index) => {
    const key = wantedKeys[index]

    return stays.has(key) && !isEqual(shown[shownKeys.indexOf(key)], item)
      ? [set(item, itemPath(key))]
      : []
  })

  return [...removals, ...inserts, ...sets]
}

function hasUniqueKeys(keys: Array<string | undefined>): keys is Array<string> {
  return (
    keys.every((key) => key !== undefined) && new Set(keys).size === keys.length
  )
}

/** The longest sequence of keys that appears in both lists in order. */
function longestCommonRun(
  keysA: Array<string>,
  keysB: Array<string>,
): Array<string> {
  const lengths = Array.from({length: keysA.length + 1}, () =>
    Array.from({length: keysB.length + 1}, () => 0),
  )

  for (let indexA = keysA.length - 1; indexA >= 0; indexA--) {
    for (let indexB = keysB.length - 1; indexB >= 0; indexB--) {
      lengths[indexA][indexB] =
        keysA[indexA] === keysB[indexB]
          ? lengths[indexA + 1][indexB + 1] + 1
          : Math.max(lengths[indexA + 1][indexB], lengths[indexA][indexB + 1])
    }
  }

  const run: Array<string> = []
  let indexA = 0
  let indexB = 0

  while (indexA < keysA.length && indexB < keysB.length) {
    if (keysA[indexA] === keysB[indexB]) {
      run.push(keysA[indexA])
      indexA++
      indexB++
    } else if (lengths[indexA + 1][indexB] >= lengths[indexA][indexB + 1]) {
      indexA++
    } else {
      indexB++
    }
  }

  return run
}
