import type {PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {EngineOperation} from '../engine/interfaces/operation'
import {
  updateRepairJournal,
  type RepairJournalEntry,
} from './subscriber.repair-journal'

/**
 * `updateRepairJournal` is what `subscribeRepairJournal` calls per
 * operation. This pins its two responsibilities directly, against plain
 * fixture data, without needing a running engine: chaining a block's
 * successive intake repairs into one entry that spans the whole repair
 * session, and retiring an entry the moment anything other than an intake
 * repair touches its block.
 */

type Journal = Map<string, RepairJournalEntry>

function journal(...entries: Array<[string, RepairJournalEntry]>): Journal {
  return new Map(entries)
}

function record(
  journalMap: Journal,
  operation: Exclude<EngineOperation, {type: 'set.selection'}>,
  beforeValue: ReadonlyArray<PortableTextBlock>,
  afterValue: ReadonlyArray<PortableTextBlock>,
  blockIndexMap: ReadonlyMap<string, number> = new Map(),
): void {
  updateRepairJournal(journalMap, operation, {
    isIntakeRepair: true,
    beforeValue,
    afterValue,
    blockIndexMap,
  })
}

function retire(
  journalMap: Journal,
  operation: Exclude<EngineOperation, {type: 'set.selection'}>,
  beforeValue: ReadonlyArray<PortableTextBlock> = [],
): void {
  updateRepairJournal(journalMap, operation, {
    isIntakeRepair: false,
    beforeValue,
    afterValue: [],
    blockIndexMap: new Map(),
  })
}

describe('updateRepairJournal: chain merging', () => {
  test('a keyless block minted a key, then repaired again, is one entry carrying the original before-shape', () => {
    const journalMap: Journal = journal()

    const keylessBlock: PortableTextBlock = {
      _type: 'block',
      children: [],
      markDefs: [],
      style: 'normal',
    } as unknown as PortableTextBlock
    const keyedEmptyBlock: PortableTextBlock = {
      _key: 'k2',
      _type: 'block',
      children: [],
      markDefs: [],
      style: 'normal',
    }

    // First repair: mint the missing `_key` (numeric segment, the block
    // itself resolved directly by index).
    record(
      journalMap,
      {type: 'set', path: [0, '_key'], value: 'k2'},
      [keylessBlock],
      [keyedEmptyBlock],
    )

    expect(journalMap).toEqual(
      journal(['k2', {beforeShape: keylessBlock, afterShape: keyedEmptyBlock}]),
    )

    // Second repair on the same block, now keyed: insert the placeholder
    // span. Resolved via `blockIndexMap` since the segment is keyed.
    const repairedBlock: PortableTextBlock = {
      _key: 'k2',
      _type: 'block',
      children: [{_key: 's0', _type: 'span', text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    record(
      journalMap,
      {
        type: 'insert',
        path: [{_key: 'k2'}, 'children', 0],
        node: {_key: 's0', _type: 'span', text: '', marks: []},
        position: 'before',
      },
      [keyedEmptyBlock],
      [repairedBlock],
      new Map([['k2', 0]]),
    )

    // One entry, not two: `beforeShape` still points at the very first
    // (keyless) shape, `afterShape` at the latest repair's result.
    expect(journalMap).toEqual(
      journal(['k2', {beforeShape: keylessBlock, afterShape: repairedBlock}]),
    )
  })

  test('a chained repair that changes the top-level key re-keys the map entry', () => {
    const journalMap: Journal = journal()

    const duplicateKeyBlock: PortableTextBlock = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 's1', _type: 'span', text: 'world', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const reKeyedBlock: PortableTextBlock = {
      ...duplicateKeyBlock,
      _key: 'k2',
    }

    record(
      journalMap,
      {type: 'set', path: [1, '_key'], value: 'k2'},
      [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        duplicateKeyBlock,
      ],
      [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        reKeyedBlock,
      ],
    )

    expect(journalMap).toEqual(
      journal([
        'k2',
        {beforeShape: duplicateKeyBlock, afterShape: reKeyedBlock},
      ]),
    )
  })

  test('a repair on a block matching no chain opens a new entry', () => {
    const journalMap: Journal = journal([
      'other',
      {
        beforeShape: {_key: 'other', _type: 'block'} as PortableTextBlock,
        afterShape: {_key: 'other', _type: 'block'} as PortableTextBlock,
      },
    ])

    const beforeBlock: PortableTextBlock = {
      _key: 'b0',
      _type: 'block',
      children: [{_type: 'span', text: 'hello', marks: []}],
      markDefs: [],
      style: 'normal',
    } as unknown as PortableTextBlock
    const afterBlock: PortableTextBlock = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 'k2', _type: 'span', text: 'hello', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    record(
      journalMap,
      {type: 'set', path: [{_key: 'b0'}, 'children', 0, '_key'], value: 'k2'},
      [beforeBlock],
      [afterBlock],
      new Map([['b0', 0]]),
    )

    expect(journalMap.get('b0')).toEqual({
      beforeShape: beforeBlock,
      afterShape: afterBlock,
    })
    expect(journalMap.size).toBe(2)
  })

  test('the block absent from `beforeValue` is skipped: no entry is recorded', () => {
    const journalMap: Journal = journal()

    record(
      journalMap,
      {type: 'set', path: [0, '_key'], value: 'k2'},
      [],
      [{_key: 'k2', _type: 'block'} as PortableTextBlock],
    )

    expect(journalMap.size).toBe(0)
  })
})

describe('updateRepairJournal: retirement', () => {
  test('an operation touching a journaled keyed block retires its entry, and leaves the others', () => {
    const entryA: RepairJournalEntry = {
      beforeShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
    }
    const entryB: RepairJournalEntry = {
      beforeShape: {_key: 'b', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 'b', _type: 'block'} as PortableTextBlock,
    }
    const journalMap: Journal = journal(['a', entryA], ['b', entryB])

    retire(journalMap, {
      type: 'insert.text',
      path: [{_key: 'a'}, 'children', {_key: 's0'}],
      offset: 0,
      text: '!',
    })

    expect(journalMap).toEqual(journal(['b', entryB]))
  })

  test('an operation touching a journaled block by numeric segment retires it via `beforeValue`', () => {
    const entry: RepairJournalEntry = {
      beforeShape: {_key: 'k2', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 'k2', _type: 'block'} as PortableTextBlock,
    }
    const journalMap: Journal = journal(['k2', entry])

    retire(journalMap, {type: 'unset', path: [0]}, [
      {_key: 'k2', _type: 'block'} as PortableTextBlock,
    ])

    expect(journalMap.size).toBe(0)
  })

  test("`replaceBlock`'s unset-then-insert sequence retires the replaced block by the inserted node's own key, not the sibling that shifted into its index", () => {
    const entryR: RepairJournalEntry = {
      beforeShape: {_key: 'r', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 'r', _type: 'block'} as PortableTextBlock,
    }
    const entryS: RepairJournalEntry = {
      beforeShape: {_key: 's', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 's', _type: 'block'} as PortableTextBlock,
    }
    const journalMap: Journal = journal(['r', entryR], ['s', entryS])

    // `replaceBlock` (sync-machine.ts) unsets the old block by its keyed
    // segment, then inserts the replacement at the same numeric index. `S`
    // has shifted into that index by the time the insert operation fires,
    // so `beforeValue[0]` is `S`, not the block the insert actually touches.
    retire(journalMap, {type: 'unset', path: [{_key: 'r'}]})
    retire(
      journalMap,
      {
        type: 'insert',
        path: [0],
        node: {_key: 'r2', _type: 'block'} as PortableTextBlock,
        position: 'before',
      },
      [{_key: 's', _type: 'block'} as PortableTextBlock],
    )

    expect(journalMap).toEqual(journal(['s', entryS]))
  })

  test('a root-path set clears the whole journal', () => {
    const journalMap: Journal = journal([
      'a',
      {
        beforeShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
        afterShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
      },
    ])

    retire(journalMap, {type: 'set', path: [], value: []})

    expect(journalMap.size).toBe(0)
  })

  test('a root-path unset clears the whole journal', () => {
    const journalMap: Journal = journal([
      'a',
      {
        beforeShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
        afterShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
      },
    ])

    retire(journalMap, {type: 'unset', path: []})

    expect(journalMap.size).toBe(0)
  })

  test('does nothing when the journal is empty (mirrors `invalidateVerifiedGroups`)', () => {
    const journalMap: Journal = journal()

    retire(journalMap, {type: 'unset', path: [{_key: 'a'}]})

    expect(journalMap.size).toBe(0)
  })

  test('an operation touching a key the journal does not hold leaves it untouched', () => {
    const entry: RepairJournalEntry = {
      beforeShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
      afterShape: {_key: 'a', _type: 'block'} as PortableTextBlock,
    }
    const journalMap: Journal = journal(['a', entry])

    retire(journalMap, {
      type: 'unset',
      path: [{_key: 'unrelated'}, 'children', {_key: 's0'}],
    })

    expect(journalMap).toEqual(journal(['a', entry]))
  })
})

describe('updateRepairJournal: FIFO cap', () => {
  test('a 101st distinct entry evicts the oldest one', () => {
    const journalMap: Journal = new Map()

    for (let index = 0; index < 100; index++) {
      const key = `k${index}`
      journalMap.set(key, {
        beforeShape: {_key: key, _type: 'block'} as PortableTextBlock,
        afterShape: {_key: key, _type: 'block'} as PortableTextBlock,
      })
    }

    const beforeBlock: PortableTextBlock = {
      _key: 'b0',
      _type: 'block',
      children: [{_type: 'span', text: 'hello', marks: []}],
      markDefs: [],
      style: 'normal',
    } as unknown as PortableTextBlock
    const afterBlock: PortableTextBlock = {
      _key: 'b0',
      _type: 'block',
      children: [{_key: 'kNew', _type: 'span', text: 'hello', marks: []}],
      markDefs: [],
      style: 'normal',
    }

    record(
      journalMap,
      {type: 'set', path: [{_key: 'b0'}, 'children', 0, '_key'], value: 'kNew'},
      [beforeBlock],
      [afterBlock],
      new Map([['b0', 0]]),
    )

    expect(journalMap.size).toBe(100)
    expect(journalMap.has('k0')).toBe(false)
    expect(journalMap.has('k1')).toBe(true)
    expect(journalMap.get('b0')).toEqual({
      beforeShape: beforeBlock,
      afterShape: afterBlock,
    })
  })
})
