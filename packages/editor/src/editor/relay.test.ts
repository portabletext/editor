import {describe, expect, test, vi} from 'vitest'
import type {EditorSelection} from '../types/editor'
import {createRelay} from './relay'

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
