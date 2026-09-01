import {describe, expect, test} from 'vitest'
import {mapRange, type Step} from './step-mapper'

const spanA = [{_key: 'b1'}, 'children', {_key: 's1'}]
const spanB = [{_key: 'b1'}, 'children', {_key: 's2'}]

describe(mapRange.name, () => {
  test('an insertion exactly at the range start rides the start past it, so the inserted text falls outside the range', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 4, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 7},
      focus: {path: spanA, offset: 11},
    })
  })

  test('an insertion exactly at the range end leaves the end behind it, so the inserted text falls outside the range', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 8, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    })
  })

  test('an insertion strictly inside the range grows it', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 6, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 11},
    })
  })

  test('a collapsed range at an insertion point stays collapsed, before the insertion', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 4, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a collapsed range strictly inside a later insertion still moves with it', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 4},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanA, offset: 2, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 7},
      focus: {path: spanA, offset: 7},
    })
  })

  test('a removal spanning the range end clamps the end to the removal start', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 6},
    }
    const steps: Array<Step> = [
      {type: 'remove.text', path: spanA, offset: 4, length: 10},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a removal spanning the range start clamps the start to the removal start', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 10},
    }
    const steps: Array<Step> = [
      {type: 'remove.text', path: spanA, offset: 0, length: 6},
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanA, offset: 0},
      focus: {path: spanA, offset: 4},
    })
  })

  test('a remove.node containing the anchor invalidates the whole range', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanB, offset: 2},
    }
    const steps: Array<Step> = [{type: 'remove.node', path: spanA}]

    expect(mapRange(steps, range)).toBeNull()
  })

  test('a remove.node containing the focus invalidates the whole range', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanB, offset: 2},
    }
    const steps: Array<Step> = [{type: 'remove.node', path: spanB}]

    expect(mapRange(steps, range)).toBeNull()
  })

  test('a move.text carrying the whole range moves both ends together', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 5},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 0, length: 7},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 2},
      focus: {path: spanB, offset: 5},
    })
  })

  test('a move.text at the range boundaries carries the anchor along (forward) but leaves the focus behind (backward)', () => {
    const range = {
      anchor: {path: spanA, offset: 4},
      focus: {path: spanA, offset: 8},
    }
    const steps: Array<Step> = [
      {
        type: 'move.text',
        from: {path: spanA, offset: 4, length: 4},
        to: {path: spanB, offset: 0},
      },
    ]

    expect(mapRange(steps, range)).toEqual({
      anchor: {path: spanB, offset: 0},
      focus: {path: spanA, offset: 8},
    })
  })

  test('an unrelated step on a different path leaves the range untransformed', () => {
    const range = {
      anchor: {path: spanA, offset: 2},
      focus: {path: spanA, offset: 5},
    }
    const steps: Array<Step> = [
      {type: 'insert.text', path: spanB, offset: 0, length: 3},
    ]

    expect(mapRange(steps, range)).toEqual(range)
  })
})
