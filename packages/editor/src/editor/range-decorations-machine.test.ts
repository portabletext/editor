import {describe, expect, test, vi} from 'vitest'
import {createActor} from 'xstate'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorSchema} from './editor-schema'
import {rangeDecorationsMachine} from './range-decorations-machine'

/**
 * A minimal stand-in for `PortableTextEditorEngine`: only the fields the
 * machine's actions and `transformRange` (for `engine operation` events)
 * actually touch. `decorate.fn` itself is never invoked, so `schema`/`value`
 * only need to satisfy path/range comparisons, not real decoration.
 */
function createEditorEngineStub(): PortableTextEditorEngine {
  return {
    operationListeners: {before: [], after: []},
    decoratedRanges: [],
    snapshot: {
      context: {
        value: [
          {
            _type: 'block',
            _key: 'block',
            children: [{_type: 'span', _key: 'span', text: 'abcdefghij'}],
          },
        ],
      },
    },
  } as unknown as PortableTextEditorEngine
}

function startReadyActor() {
  const editorEngine = createEditorEngineStub()
  const actor = createActor(rangeDecorationsMachine, {
    input: {readOnly: false, schema: {} as EditorSchema, editorEngine},
  })
  actor.start()
  actor.send({type: 'ready'})
  return actor
}

const spanPath = [{_key: 'block'}, 'children', {_key: 'span'}]

const selectionA = {
  anchor: {path: spanPath, offset: 0},
  focus: {path: spanPath, offset: 3},
}

const selectionB = {
  anchor: {path: spanPath, offset: 1},
  focus: {path: spanPath, offset: 4},
}

describe(rangeDecorationsMachine.id, () => {
  test('Scenario: an equal prop resupply skips reassigning `decorate.fn`', () => {
    const actor = startReadyActor()

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
    const actor = startReadyActor()

    const component = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionA}],
    })
    const decorateAfterFirstSupply = actor.getSnapshot().context.decorate.fn

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionA}],
    })
    expect(actor.getSnapshot().context.decorate.fn).toBe(
      decorateAfterFirstSupply,
    )

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionB}],
    })
    expect(actor.getSnapshot().context.decorate.fn).not.toBe(
      decorateAfterFirstSupply,
    )
  })

  test('Scenario: removing a source that contributed no decorated ranges skips reassigning `decorate.fn`', () => {
    const actor = startReadyActor()

    const component = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'empty',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: null}],
    })
    const decorateAfterEmptySupply = actor.getSnapshot().context.decorate.fn

    actor.send({type: 'source removed', sourceKey: 'empty'})

    expect(actor.getSnapshot().context.decorate.fn).toBe(
      decorateAfterEmptySupply,
    )
  })

  test('Scenario: removing a source that contributed decorated ranges reassigns `decorate.fn`', () => {
    const actor = startReadyActor()

    const component = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'live',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionA}],
    })
    const decorateAfterLiveSupply = actor.getSnapshot().context.decorate.fn

    actor.send({type: 'source removed', sourceKey: 'live'})

    expect(actor.getSnapshot().context.decorate.fn).not.toBe(
      decorateAfterLiveSupply,
    )
  })

  test('Scenario: a redundant update() does not resurrect a decoration killed by an edit, and does not re-fire `moved`', () => {
    const actor = startReadyActor()

    const on = vi.fn()
    const component = () => null as never
    const registration = {id: 'a', component, range: selectionA}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    // Kill it: removing the span node the range points into makes
    // `transformRange` resolve to `null`.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: 'block'}, 'children', {_key: 'span'}],
      },
      origin: 'local',
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(false)
    expect(on).toHaveBeenCalledTimes(1)
    expect(on).toHaveBeenCalledWith({
      type: 'moved',
      newRange: null,
      rangeDecoration: registration,
      origin: 'local',
    })

    // A redundant `update()` resupplying the same (now stale) selection:
    // the consumer hasn't folded the `{type: 'moved', newRange: null}`
    // event in yet.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(false)
    expect(on).toHaveBeenCalledTimes(1)

    // A deliberate re-anchor (a genuinely different selection) revives it.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{...registration, range: selectionB}],
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(true)
  })

  test('Scenario: a redundant update() with the original selection does not resurrect a decoration killed after moving', () => {
    const actor = startReadyActor()

    const on = vi.fn()
    const component = () => null as never
    const registration = {id: 'a', component, range: selectionA}

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

    // Kill it: removing the span node the (now-moved) range points into
    // makes `transformRange` resolve to `null`.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: 'block'}, 'children', {_key: 'span'}],
      },
      origin: 'local',
    })

    expect(on).toHaveBeenCalledTimes(2)

    // A redundant `update()` resupplying the original (never-moved)
    // range: the consumer never folded in the intervening `moved` events,
    // so this isn't a deliberate re-anchor either.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(false)
    expect(on).toHaveBeenCalledTimes(2)
  })

  test("Scenario: a redundant update() with an unchanged null selection does not re-fire 'moved'", () => {
    const actor = startReadyActor()

    const on = vi.fn()
    const component = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: null}],
      on,
    })

    expect(on).toHaveBeenCalledTimes(1)

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: null}],
    })

    expect(on).toHaveBeenCalledTimes(1)

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionA}],
    })

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(true)
  })

  test('Scenario: dropping a killed id then re-adding it with the same range revives it', () => {
    const actor = startReadyActor()

    const on = vi.fn()
    const component = () => null as never
    const registration = {id: 'a', component, range: selectionA}

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [registration],
      on,
    })

    // Kill it: removing the span node the range points into makes
    // `transformRange` resolve to `null`.
    actor.send({
      type: 'engine operation',
      operation: {
        type: 'unset',
        path: [{_key: 'block'}, 'children', {_key: 'span'}],
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

    expect(
      actor
        .getSnapshot()
        .context.editorEngine.decoratedRanges.some(
          (decoratedRange) =>
            (decoratedRange.rangeDecoration as {id?: string}).id === 'a',
        ),
    ).toBe(true)
  })

  test('Scenario: a dropped id does not leave its tombstone behind', () => {
    const actor = startReadyActor()

    const component = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: selectionA}],
    })

    // Kill it via an explicit `range: null` resupply.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component, range: null}],
    })

    const deadSelectionsAfterKill = actor
      .getSnapshot()
      .context.sources.find(
        (source) => source.sourceKey === 'registered',
      )?.deadSelections
    expect(deadSelectionsAfterKill?.size).toEqual(1)

    // Drop it: `update()` no longer mentions `a` at all.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [],
    })

    const deadSelectionsAfterDrop = actor
      .getSnapshot()
      .context.sources.find(
        (source) => source.sourceKey === 'registered',
      )?.deadSelections
    expect(deadSelectionsAfterDrop?.size).toEqual(0)
  })

  test('Scenario: swapping the `component` in an `update()` after a move keeps the live position', () => {
    const actor = startReadyActor()

    const componentOne = () => null as never
    const componentTwo = () => null as never

    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component: componentOne, range: selectionA}],
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

    // Resupply the original (still-configured) range with a new
    // `component`: the range half of the reconciliation carries the live,
    // moved position over; the component half still adopts the new
    // reference.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [{id: 'a', component: componentTwo, range: selectionA}],
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
    expect(
      (decoratedRange?.rangeDecoration as {component?: unknown})?.component,
    ).toBe(componentTwo)
  })

  test('Scenario: each registration delivers `moved` events to its own `on` handler', () => {
    const actor = startReadyActor()

    const onFirst = vi.fn()
    const onSecond = vi.fn()
    const component = () => null as never
    const firstRegistration = {id: 'first', component, range: selectionA}
    const secondRegistration = {id: 'second', component, range: selectionA}

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

    // Inserting text before both ranges moves both.
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
    expect(onFirst).toHaveBeenCalledWith({
      type: 'moved',
      newRange: movedSelectionA,
      rangeDecoration: firstRegistration,
      origin: 'local',
    })
    expect(onSecond).toHaveBeenCalledTimes(1)
    expect(onSecond).toHaveBeenCalledWith({
      type: 'moved',
      newRange: movedSelectionA,
      rangeDecoration: secondRegistration,
      origin: 'local',
    })
  })

  test('Scenario: a prop source registered after `ready` (mounted after another source) still initializes', () => {
    const actor = startReadyActor()

    actor.send({
      type: 'source updated',
      sourceKey: 'late-prop',
      kind: 'prop',
      rangeDecorations: [
        {component: () => null as never, selection: selectionA},
      ],
    })

    expect(
      actor.getSnapshot().context.editorEngine.decoratedRanges,
    ).toHaveLength(1)
  })

  test('Scenario: prop sources flatten before registered sources regardless of arrival order', () => {
    const actor = startReadyActor()

    // Arrival order: registration first, prop second - the opposite of the
    // promised render order.
    actor.send({
      type: 'source updated',
      sourceKey: 'registered',
      kind: 'registered',
      rangeDecorations: [
        {id: 'a', component: () => null as never, range: selectionA},
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

    const decoratedRanges =
      actor.getSnapshot().context.editorEngine.decoratedRanges
    expect(decoratedRanges).toHaveLength(2)
    expect((decoratedRanges[0]!.rangeDecoration as {id?: string}).id).toEqual(
      undefined,
    )
    expect((decoratedRanges[1]!.rangeDecoration as {id?: string}).id).toEqual(
      'a',
    )
  })
})
