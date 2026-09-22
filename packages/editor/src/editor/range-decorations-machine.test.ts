import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createActor} from 'xstate'
import type {Decoration} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorSchema} from './editor-schema'
import {rangeDecorationsMachine} from './range-decorations-machine'

/**
 * A minimal stand-in for `PortableTextEditorEngine`: only the fields the
 * machine's actions and `transformRange` (for `engine operation` events)
 * actually touch. `decorate.fn` itself is never invoked, so `schema`/`value`
 * only need to satisfy path/range comparisons, not real decoration.
 */
function createEditorEngineStub(
  blockKey: string,
  spanKey: string,
): PortableTextEditorEngine {
  return {
    operationListeners: {before: [], after: []},
    decoratedRanges: [],
    snapshot: {
      context: {
        value: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: 'abcdefghij'}],
          },
        ],
      },
    },
  } as unknown as PortableTextEditorEngine
}

function startReadyActor(blockKey: string, spanKey: string) {
  const editorEngine = createEditorEngineStub(blockKey, spanKey)
  const actor = createActor(rangeDecorationsMachine, {
    input: {readOnly: false, schema: {} as EditorSchema, editorEngine},
  })
  actor.start()
  actor.send({type: 'ready'})
  return actor
}

function decoratedRangeIds(actor: ReturnType<typeof startReadyActor>) {
  return actor
    .getSnapshot()
    .context.editorEngine.decoratedRanges.map(
      (decoratedRange) => (decoratedRange.rangeDecoration as {id?: string}).id,
    )
}

describe(rangeDecorationsMachine.id, () => {
  test('Scenario: an equal prop resupply skips reassigning `decorate.fn`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const selectionB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const decorateAtReady = actor.getSnapshot().context.decorate.fn

    actor.send({
      type: 'source updated',
      sourceKey: 'prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA},
      ],
    })
    const decorateAfterFirstSupply = actor.getSnapshot().context.decorate.fn
    expect(decorateAfterFirstSupply).not.toBe(decorateAtReady)

    actor.send({
      type: 'source updated',
      sourceKey: 'prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA},
      ],
    })
    expect(actor.getSnapshot().context.decorate.fn).toBe(
      decorateAfterFirstSupply,
    )

    actor.send({
      type: 'source updated',
      sourceKey: 'prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionB},
      ],
    })
    expect(actor.getSnapshot().context.decorate.fn).not.toBe(
      decorateAfterFirstSupply,
    )
  })

  test('Scenario: a fully unchanged registered resupply skips reassigning `decorate.fn`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const selectionB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', type: 'range', render, range: selectionA}],
    })
    const decorateAfterFirstSupply = actor.getSnapshot().context.decorate.fn

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', type: 'range', render, range: selectionA}],
    })
    expect(actor.getSnapshot().context.decorate.fn).toBe(
      decorateAfterFirstSupply,
    )

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', type: 'range', render, range: selectionB}],
    })
    expect(actor.getSnapshot().context.decorate.fn).not.toBe(
      decorateAfterFirstSupply,
    )
  })

  test('Scenario: removing a source that contributed no decorated ranges skips reassigning `decorate.fn`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const actor = startReadyActor(blockKey, spanKey)

    actor.send({
      type: 'source updated',
      sourceKey: 'empty',
      kind: 'registered',
      rangeDecorations: [],
    })
    const decorateAfterEmptySupply = actor.getSnapshot().context.decorate.fn

    actor.send({type: 'source removed', sourceKey: 'empty'})

    expect(actor.getSnapshot().context.decorate.fn).toBe(
      decorateAfterEmptySupply,
    )
  })

  test('Scenario: removing a source that contributed decorated ranges reassigns `decorate.fn`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'live',
      kind: 'registered',
      rangeDecorations: [{id: 'a', type: 'range', render, range: selectionA}],
    })
    const decorateAfterLiveSupply = actor.getSnapshot().context.decorate.fn

    actor.send({type: 'source removed', sourceKey: 'live'})

    expect(actor.getSnapshot().context.decorate.fn).not.toBe(
      decorateAfterLiveSupply,
    )
  })

  test('Scenario: a redundant update() does not resurrect a decoration killed by an edit, and does not re-deliver its `newRange: null` mapping', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const selectionB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
      },
      origin: 'local',
    })

    expect(decoratedRangeIds(actor)).toEqual([])
    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: selectionA,
        newRange: null,
        contentTouched: true,
        origin: 'local',
      },
    ])

    // A redundant `update()` resupplying the same (now stale) selection,
    // before the consumer has observed the `newRange: null` mapping.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    expect(decoratedRangeIds(actor)).toEqual([])
    expect(on).toHaveBeenCalledTimes(1)

    // A deliberate re-anchor (a genuinely different selection) revives it.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{...registration, range: selectionB}],
    })

    expect(decoratedRangeIds(actor)).toEqual(['a'])
  })

  test('Scenario: a redundant update() with the original selection does not resurrect a decoration killed after moving', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    // Move it: inserting text before the range shifts both endpoints, so
    // the live range (unbeknownst to the consumer) is no longer
    // `selectionA`.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenNthCalledWith(1, [
      {
        id: 'a',
        previousRange: selectionA,
        newRange: movedSelectionA,
        contentTouched: false,
        origin: 'local',
      },
    ])

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
      },
      origin: 'local',
    })

    expect(on).toHaveBeenCalledTimes(2)
    expect(on).toHaveBeenNthCalledWith(2, [
      {
        id: 'a',
        previousRange: movedSelectionA,
        newRange: null,
        contentTouched: true,
        origin: 'local',
      },
    ])

    // A redundant `update()` resupplying the original (never-moved)
    // range: the consumer never observed the intervening mapping that
    // moved it, so this isn't a deliberate re-anchor either.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    expect(decoratedRangeIds(actor)).toEqual([])
    expect(on).toHaveBeenCalledTimes(2)
  })

  test('Scenario: a redundant update() resupplying the range a decoration died under (after moving) does not resurrect it', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const selectionB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    // Move it: inserting text before the range shifts both endpoints away
    // from `selectionA`, the range this `id` was registered with.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
      },
      origin: 'local',
    })

    // A redundant `update()` resupplying the range it died under - not the
    // originally configured `selectionA`, but the live position at time of
    // death - is exactly as stale.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{...registration, range: movedSelectionA}],
    })

    expect(decoratedRangeIds(actor)).toEqual([])

    // A range different from both the configured and the died-under one
    // is a deliberate re-anchor: it revives.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{...registration, range: selectionB}],
    })

    expect(decoratedRangeIds(actor)).toEqual(['a'])
  })

  test('Scenario: a resupplied death range carrying extra own keys (e.g. `backward`) does not resurrect the decoration', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
      backward: true,
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
      },
      origin: 'local',
    })

    expect(decoratedRangeIds(actor)).toEqual([])

    // The exact death range, but with `backward: true` added back (as a
    // freshly captured editor selection would carry): same anchor and
    // focus, one extra own key.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {...registration, range: {...movedSelectionA, backward: true}},
      ],
    })

    expect(decoratedRangeIds(actor)).toEqual([])
  })

  test('Scenario: dropping a killed id then re-adding it with the same range revives it', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: blockKey}, 'children', {_key: spanKey}],
      },
      origin: 'local',
    })

    // Drop it: the next `update()` omits `a` entirely, not just its range.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [],
    })

    // Re-add it with the same range it died under. Coming back after a
    // drop is a fresh registration, not a redundant resupply, so it
    // revives even though the range matches the tombstone.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    expect(decoratedRangeIds(actor)).toEqual(['a'])
  })

  test('Scenario: swapping the `render` reference in an `update()` after a move keeps the live position', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const renderOne = () => null as never
    const renderTwo = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {id: 'a', type: 'range', render: renderOne, range: selectionA},
      ],
    })

    // Move it: inserting text before the range shifts both endpoints away
    // from `selectionA`, the range this `id` was registered with.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    // Resupply the original (still-configured) range with a new `render`:
    // the range half of the reconciliation carries the live, moved
    // position over; the render half still adopts the new reference.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {id: 'a', type: 'range', render: renderTwo, range: selectionA},
      ],
    })

    const decoratedRange = actor
      .getSnapshot()
      .context.editorEngine.decoratedRanges.find(
        (candidate) => (candidate.rangeDecoration as {id?: string}).id === 'a',
      )
    expect({
      anchor: decoratedRange?.anchor,
      focus: decoratedRange?.focus,
      render: (decoratedRange?.rangeDecoration as {render?: unknown})?.render,
    }).toEqual({...movedSelectionA, render: renderTwo})
  })

  test('Scenario: resupplying the original range with extra own keys (e.g. `backward`) after a move keeps the live position', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', type: 'range', render, range: selectionA}],
    })

    // Move it: inserting text before the range shifts both endpoints away
    // from `selectionA`, the range this `id` was registered with.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    // Same anchor/focus as the original config, but with `backward: true`
    // added, as a captured editor selection would carry: not a re-anchor.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {
          id: 'a',
          type: 'range',
          render,
          range: {...selectionA, backward: true},
        },
      ],
    })

    const decoratedRange = actor
      .getSnapshot()
      .context.editorEngine.decoratedRanges.find(
        (candidate) => (candidate.rangeDecoration as {id?: string}).id === 'a',
      )
    expect({
      anchor: decoratedRange?.anchor,
      focus: decoratedRange?.focus,
    }).toEqual(movedSelectionA)
  })

  test("Scenario: each registration's `on` handler only receives its own decoration's mapping", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const onFirst = vi.fn()
    const onSecond = vi.fn()
    const render = () => null as never
    const firstRegistration: Decoration = {
      id: 'first',
      type: 'range',
      render,
      range: selectionA,
    }
    const secondRegistration: Decoration = {
      id: 'second',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'first',
      kind: 'registered',
      rangeDecorations: [firstRegistration],
      on: onFirst,
    })
    actor.send({
      type: 'source updated',
      sourceKey: 'second',
      kind: 'registered',
      rangeDecorations: [secondRegistration],
      on: onSecond,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    const movedSelectionA = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    expect(onFirst).toHaveBeenCalledTimes(1)
    expect(onFirst).toHaveBeenCalledWith([
      {
        id: 'first',
        previousRange: selectionA,
        newRange: movedSelectionA,
        contentTouched: false,
        origin: 'local',
      },
    ])
    expect(onSecond).toHaveBeenCalledTimes(1)
    expect(onSecond).toHaveBeenCalledWith([
      {
        id: 'second',
        previousRange: selectionA,
        newRange: movedSelectionA,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test("Scenario: removing a decoration's own first character delivers a mapping with `contentTouched: true`", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'remove.text',
        path: spanPath,
        offset: 3,
        text: 'd',
      },
      origin: 'local',
    })

    const shrunkRange = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 5},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: shrunkRange,
        contentTouched: true,
        origin: 'local',
      },
    ])
  })

  test('Scenario: a removal starting before a decorated range and extending into it delivers a mapping with `contentTouched: true`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'remove.text',
        path: spanPath,
        offset: 1,
        text: 'bcd',
      },
      origin: 'local',
    })

    const shiftedRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: shiftedRange,
        contentTouched: true,
        origin: 'local',
      },
    ])
  })

  test('Scenario: a `remove.text` straddling a collapsed decoration delivers a mapping with `contentTouched: false`', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 4},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'remove.text',
        path: spanPath,
        offset: 3,
        text: 'def',
      },
      origin: 'local',
    })

    const shiftedRange = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 3},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: shiftedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test("Scenario: an `insert.text` exactly at a range's own start delivers a mapping with `contentTouched: false`", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 3,
        text: 'XY',
      },
      origin: 'local',
    })

    const shiftedRange = {
      anchor: {path: spanPath, offset: 5},
      focus: {path: spanPath, offset: 8},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: shiftedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test("Scenario: an `insert.text` exactly at a range's own end delivers no event at all", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 6,
        text: 'XY',
      },
      origin: 'local',
    })

    expect(on).not.toHaveBeenCalled()
  })

  test("Scenario: a `remove.text` ending exactly at a range's own start delivers a mapping with `contentTouched: false`", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'remove.text',
        path: spanPath,
        offset: 1,
        text: 'ab',
      },
      origin: 'local',
    })

    const shiftedRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: shiftedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test('Scenario: a prop source registered after `ready` (mounted after another source) still initializes', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    actor.send({
      type: 'source updated',
      sourceKey: 'late-prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA},
      ],
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.map((decoratedRange) => ({
          anchor: decoratedRange.anchor,
          focus: decoratedRange.focus,
        })),
    ).toEqual([selectionA])
  })

  test('Scenario: prop sources flatten before registered sources regardless of arrival order', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    // Arrival order: registration first, prop second - the opposite of the
    // promised render order.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {
          id: 'a',
          type: 'range',
          render: () => null as never,
          range: selectionA,
        },
      ],
    })
    actor.send({
      type: 'source updated',
      sourceKey: 'prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA},
      ],
    })

    expect(decoratedRangeIds(actor)).toEqual([undefined, 'a'])
  })

  test('Scenario: mutating a range object after registering it does not corrupt tracking', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const anchorSegment = {_key: blockKey}
    const spanPath = [anchorSegment, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    range.anchor.offset = 999
    range.focus.offset = 999
    // The segment mutation reaches tracking through a shallow `[...path]`
    // copy, which still shares segment objects; the splice and slot write
    // only reach it through a fully aliased array.
    anchorSegment._key = 'segment-mutated'
    range.anchor.path.splice(0)
    range.focus.path[0] = {_key: 'mutated'}

    // A path built fresh from the same keys, not `spanPath`: a shallow
    // clone shares `range`'s path arrays or their segment objects with
    // tracking, so asserting against `spanPath` itself would compare the
    // mutated path to itself and pass regardless of the leak.
    const trackedPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const [decoratedRange] =
      actor.getSnapshot().context.editorEngine.decoratedRanges

    expect({
      anchor: decoratedRange?.anchor,
      focus: decoratedRange?.focus,
    }).toEqual({
      anchor: {path: trackedPath, offset: 0},
      focus: {path: trackedPath, offset: 3},
    })
  })

  test('Scenario: update() reconciles a decoration whose range object was mutated in place after registering, not skipped as unchanged', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const actor = startReadyActor(blockKey, spanKey)

    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    registration.range.focus.offset = 6
    registration.range.anchor.path[0] = {_key: 'mutated'}

    // Resupplying the exact same (mutated) object reference: a config
    // mirror that aliases the consumer's own object would see it as
    // `previousConfig.range === incoming.range` and skip the
    // reconciliation this mutation is meant to trigger.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    const mutatedPath = [{_key: 'mutated'}, 'children', {_key: spanKey}]

    const [decoratedRange] =
      actor.getSnapshot().context.editorEngine.decoratedRanges

    expect({
      anchor: decoratedRange?.anchor,
      focus: decoratedRange?.focus,
    }).toEqual({
      anchor: {path: mutatedPath, offset: 0},
      focus: {path: mutatedPath, offset: 6},
    })
  })

  test("Scenario: mutating a delivered mapping's range does not corrupt subsequent tracking", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const actor = startReadyActor(blockKey, spanKey)

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: selectionA,
    }

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {type: 'insert.text', path: spanPath, offset: 0, text: 'XY'},
      origin: 'local',
    })

    // A path built fresh from the same keys, not `spanPath`: the
    // mutations below target the delivered mapping's own path array,
    // which the buggy shallow clone aliases straight through to
    // `spanPath`. Asserting against `spanPath` itself would make a
    // corrupted actual and a correspondingly corrupted expectation
    // agree, masking the bug instead of catching it.
    const trackedPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const movedSelectionA = {
      anchor: {path: trackedPath, offset: 2},
      focus: {path: trackedPath, offset: 5},
    }

    const firstMapping = on.mock.calls[0]?.[0]?.[0]
    firstMapping.previousRange.anchor.offset = 999
    firstMapping.newRange.anchor.offset = 999
    firstMapping.previousRange.anchor.path.splice(0)
    firstMapping.newRange.anchor.path[0] = {_key: 'mutated'}

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: trackedPath,
        offset: 0,
        text: 'Z',
      },
      origin: 'local',
    })

    const secondMovedSelectionA = {
      anchor: {path: trackedPath, offset: 3},
      focus: {path: trackedPath, offset: 6},
    }

    expect(on).toHaveBeenCalledTimes(2)
    expect(on).toHaveBeenNthCalledWith(2, [
      {
        id: 'a',
        previousRange: movedSelectionA,
        newRange: secondMovedSelectionA,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test('Scenario: a read-only editor still transforms and delivers mappings for a registered decoration', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const editorEngine = createEditorEngineStub(blockKey, spanKey)
    const actor = createActor(rangeDecorationsMachine, {
      input: {readOnly: true, schema: {} as EditorSchema, editorEngine},
    })
    actor.start()
    actor.send({type: 'ready'})

    const on = vi.fn()
    const render = () => null as never
    const registration: Decoration = {id: 'a', type: 'range', render, range}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'remote',
    })

    const movedRange = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 5},
    }

    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith([
      {
        id: 'a',
        previousRange: range,
        newRange: movedRange,
        contentTouched: false,
        origin: 'remote',
      },
    ])
    expect(decoratedRangeIds(actor)).toEqual(['a'])
  })

  test("Scenario: a read-only editor keeps not moving the legacy prop's decoration", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const selectionA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const editorEngine = createEditorEngineStub(blockKey, spanKey)
    const actor = createActor(rangeDecorationsMachine, {
      input: {readOnly: true, schema: {} as EditorSchema, editorEngine},
    })
    actor.start()
    actor.send({type: 'ready'})

    const onMoved = vi.fn()
    actor.send({
      type: 'source updated',
      sourceKey: 'prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA, onMoved},
      ],
    })

    actor.send({
      type: 'engine operation',
      operation: {
        type: 'insert.text',
        path: spanPath,
        offset: 0,
        text: 'XY',
      },
      origin: 'local',
    })

    expect(onMoved).not.toHaveBeenCalled()
    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.map((decoratedRange) => ({
          anchor: decoratedRange.anchor,
          focus: decoratedRange.focus,
        })),
    ).toEqual([selectionA])
  })
})
