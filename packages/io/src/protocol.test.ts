import {set} from '@portabletext/patches'
import {describe, expect, test} from 'vitest'
import {createContext, load, takeHeld} from './protocol'

describe(takeHeld.name, () => {
  test('skips every transaction held up to the one that led to the loaded revision', () => {
    const loaded = load(createContext(), {
      type: 'load',
      value: [],
      rev: 'r3',
    }).context
    const outcome = takeHeld(
      {
        ...loaded,
        held: [
          {
            type: 'transaction',
            transactionId: 'r2',
            previousRev: 'r1',
            resultRev: 'r2',
            patches: [set('foo', [0])],
          },
          {
            type: 'transaction',
            transactionId: 'r3',
            previousRev: 'r2',
            resultRev: 'r3',
            patches: [set('bar', [0])],
          },
        ],
      },
      {onReady: true},
    )

    expect(outcome).toEqual({
      context: {...loaded, held: []},
      emitted: [],
    })
  })
})
