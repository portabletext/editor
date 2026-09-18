import type {Patch} from '@portabletext/patches'
import {describe, expect, test} from 'vitest'
import {createMutationLedger} from './mutation-ledger'

function setPatch(key: string, value: string): Patch {
  return {
    type: 'set',
    path: [{_key: key}, 'children', {_key: `${key}-span`}, 'text'],
    value,
    origin: 'local',
  }
}

describe('mutation ledger', () => {
  test('records emitted patches and drains them on matching echoes', () => {
    const ledger = createMutationLedger()

    ledger.record([setPatch('b1', 'foo'), setPatch('b2', 'bar')])

    expect(ledger.unacknowledged()).toEqual([
      setPatch('b1', 'foo'),
      setPatch('b2', 'bar'),
    ])

    expect(ledger.acknowledge(setPatch('b1', 'foo'))).toBe(true)

    expect(ledger.unacknowledged()).toEqual([setPatch('b2', 'bar')])

    expect(ledger.acknowledge(setPatch('b2', 'bar'))).toBe(true)

    expect(ledger.unacknowledged()).toEqual([])
  })

  test('matches echoes structurally, ignoring `origin`', () => {
    const ledger = createMutationLedger()

    ledger.record([setPatch('b1', 'foo')])

    expect(
      ledger.acknowledge({...setPatch('b1', 'foo'), origin: 'remote'}),
    ).toBe(true)
    expect(ledger.unacknowledged()).toEqual([])
  })

  test('rejects an echo it never recorded', () => {
    const ledger = createMutationLedger()

    ledger.record([setPatch('b1', 'foo')])

    expect(ledger.acknowledge(setPatch('b1', 'bar'))).toBe(false)
    expect(ledger.unacknowledged()).toEqual([setPatch('b1', 'foo')])
  })

  test('an acknowledgment drops every older record', () => {
    const ledger = createMutationLedger()

    ledger.record([
      setPatch('b1', 'foo'),
      setPatch('b2', 'bar'),
      setPatch('b3', 'baz'),
    ])

    // Echoes arrive in application order, so an ack for `b2` proves the
    // `b1` echo is never coming.
    expect(ledger.acknowledge(setPatch('b2', 'bar'))).toBe(true)

    expect(ledger.unacknowledged()).toEqual([setPatch('b3', 'baz')])
  })

  test('a duplicate echo acknowledges only once', () => {
    const ledger = createMutationLedger()

    ledger.record([setPatch('b1', 'foo')])

    expect(ledger.acknowledge(setPatch('b1', 'foo'))).toBe(true)
    expect(ledger.acknowledge(setPatch('b1', 'foo'))).toBe(false)
  })

  test('caps the backlog by dropping the oldest records', () => {
    const ledger = createMutationLedger()

    for (let index = 0; index < 501; index++) {
      ledger.record([setPatch(`b${index}`, 'foo')])
    }

    expect(ledger.unacknowledged()).toHaveLength(500)
    expect(ledger.unacknowledged().at(0)).toEqual(setPatch('b1', 'foo'))
    expect(ledger.acknowledge(setPatch('b0', 'foo'))).toBe(false)
  })

  test('identical recorded patches drain one echo at a time, oldest first', () => {
    const ledger = createMutationLedger()

    ledger.record([setPatch('b1', 'foo')])
    ledger.record([setPatch('b1', 'foo')])

    expect(ledger.acknowledge(setPatch('b1', 'foo'))).toBe(true)
    expect(ledger.unacknowledged()).toEqual([setPatch('b1', 'foo')])

    expect(ledger.acknowledge(setPatch('b1', 'foo'))).toBe(true)
    expect(ledger.unacknowledged()).toEqual([])
  })
})
