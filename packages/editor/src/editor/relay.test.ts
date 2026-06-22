import {describe, expect, test, vi} from 'vitest'
import type {EditorSelection} from '../types/editor'
import {createRelay, type EditorEmittedEvent} from './relay'

function createSelection(offset: number): NonNullable<EditorSelection> {
  return {
    anchor: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset},
    focus: {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset},
  }
}

describe('relay', () => {
  test('delivers events to type listeners and `*` listeners in subscription order', () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<string> = []

    relay.on('ready', () => {
      deliveries.push('ready-first')
    })
    relay.on('ready', () => {
      deliveries.push('ready-second')
    })
    relay.on('*', (event) => {
      deliveries.push(`star:${event.type}`)
    })

    relay.send({type: 'ready'})
    relay.send({type: 'editable'})

    expect(deliveries).toEqual([
      'ready-first',
      'ready-second',
      'star:ready',
      'star:editable',
    ])
  })

  test('events sent during dispatch are queued until the current event is fully delivered', () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<string> = []

    relay.on('ready', () => {
      deliveries.push('ready-first')
      relay.send({type: 'editable'})
    })
    relay.on('ready', () => {
      deliveries.push('ready-second')
    })
    relay.on('editable', () => {
      deliveries.push('editable')
    })

    relay.send({type: 'ready'})

    // The `editable` event sent by the first listener must not interleave
    // before the second `ready` listener has run.
    expect(deliveries).toEqual(['ready-first', 'ready-second', 'editable'])
  })

  test('deduplicates consecutive selection events carrying the same reference', () => {
    const relay = createRelay()
    relay.start()
    const selections: Array<EditorSelection> = []

    relay.on('selection', (event) => {
      selections.push(event.selection)
    })

    const firstSelection = createSelection(0)
    const secondSelection = createSelection(1)

    relay.send({type: 'selection', selection: firstSelection})
    relay.send({type: 'selection', selection: firstSelection})
    relay.send({type: 'selection', selection: secondSelection})

    expect(selections).toEqual([firstSelection, secondSelection])
  })

  test('a `focused` event lets an identical selection through', () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<string> = []

    relay.on('selection', () => {
      deliveries.push('selection')
    })
    relay.on('focused', () => {
      deliveries.push('focused')
    })

    const selection = createSelection(0)

    relay.send({type: 'selection', selection})
    relay.send({
      type: 'focused',
      event: {} as never,
    })
    relay.send({type: 'selection', selection})

    expect(deliveries).toEqual(['selection', 'focused', 'selection'])
  })

  test('buffers events sent before start and drops events sent after stop', () => {
    const relay = createRelay()
    const deliveries: Array<string> = []

    relay.on('ready', () => {
      deliveries.push('ready')
    })

    relay.send({type: 'ready'})
    expect(deliveries).toEqual([])

    relay.start()
    expect(deliveries).toEqual(['ready'])

    relay.stop()
    relay.send({type: 'ready'})
    expect(deliveries).toEqual(['ready'])
  })

  test('a throwing listener does not prevent delivery to remaining listeners', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const relay = createRelay()
    relay.start()
    const deliveries: Array<string> = []

    relay.on('ready', () => {
      throw new Error('listener bug')
    })
    relay.on('ready', () => {
      deliveries.push('second')
    })
    relay.on('*', () => {
      deliveries.push('star')
    })

    relay.send({type: 'ready'})
    relay.send({type: 'ready'})

    expect(deliveries).toEqual(['second', 'star', 'second', 'star'])
    expect(consoleError).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })

  test('unsubscribing during dispatch does not skip other listeners', () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<string> = []

    const subscription = relay.on('ready', () => {
      deliveries.push('first')
      subscription.unsubscribe()
    })
    relay.on('ready', () => {
      deliveries.push('second')
    })

    relay.send({type: 'ready'})
    relay.send({type: 'ready'})

    expect(deliveries).toEqual(['first', 'second', 'second'])
  })
})

describe('relay batch delivery (batch: true)', () => {
  test('coalesces a synchronous burst into one call carrying the events in order', async () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<Array<EditorEmittedEvent>> = []

    relay.on(
      '*',
      (events) => {
        deliveries.push(events)
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    relay.send({type: 'editable'})

    // Nothing is delivered synchronously.
    expect(deliveries).toEqual([])

    await Promise.resolve()

    expect(deliveries).toEqual([[{type: 'ready'}, {type: 'editable'}]])
  })

  test('delivers separate microtask bursts as separate calls', async () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<Array<EditorEmittedEvent>> = []

    relay.on(
      '*',
      (events) => {
        deliveries.push(events)
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    await Promise.resolve()
    relay.send({type: 'editable'})
    await Promise.resolve()

    expect(deliveries).toEqual([[{type: 'ready'}], [{type: 'editable'}]])
  })

  test('a sync and a batch listener on the same type coexist: sync per event, batch coalesced', async () => {
    const relay = createRelay()
    relay.start()
    const sync: Array<string> = []
    const batched: Array<Array<string>> = []

    relay.on('ready', (event) => {
      sync.push(event.type)
    })
    relay.on(
      'ready',
      (events) => {
        batched.push(events.map((event) => event.type))
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    relay.send({type: 'ready'})

    // The sync listener has already fired once per event; the batch listener
    // has not fired yet.
    expect(sync).toEqual(['ready', 'ready'])
    expect(batched).toEqual([])

    await Promise.resolve()

    expect(batched).toEqual([['ready', 'ready']])
  })

  test('does not deliver a pending burst after unsubscribe', async () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<Array<EditorEmittedEvent>> = []

    const subscription = relay.on(
      '*',
      (events) => {
        deliveries.push(events)
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    subscription.unsubscribe()
    await Promise.resolve()

    expect(deliveries).toEqual([])
  })

  test('does not deliver a pending burst after stop', async () => {
    const relay = createRelay()
    relay.start()
    const deliveries: Array<Array<EditorEmittedEvent>> = []

    relay.on(
      '*',
      (events) => {
        deliveries.push(events)
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    relay.stop()
    await Promise.resolve()

    expect(deliveries).toEqual([])
  })

  test('a throwing batch listener is contained, and both it and a co-listener keep receiving later bursts', async () => {
    const relay = createRelay()
    relay.start()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const coListenerBursts: Array<Array<string>> = []

    relay.on(
      'ready',
      () => {
        throw new Error('boom')
      },
      {batch: true},
    )
    relay.on(
      'ready',
      (events) => {
        coListenerBursts.push(events.map((event) => event.type))
      },
      {batch: true},
    )

    relay.send({type: 'ready'})
    await Promise.resolve()
    relay.send({type: 'ready'})
    await Promise.resolve()

    // The throw is contained per burst (so a second burst still flushes), and
    // the co-subscribed listener receives both bursts unaffected.
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(coListenerBursts).toEqual([['ready'], ['ready']])

    errorSpy.mockRestore()
  })
})
