import {describe, expect, test} from 'vitest'
import {createActor} from 'xstate'
import type {EditorSelection} from '../types/editor'
import {relayMachine} from './relay-machine'

const selection: EditorSelection = {
  anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
  focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
  backward: false,
}

describe(relayMachine.id, () => {
  test('a repeated selection is deduped instead of falling through to the wildcard', () => {
    const relayActor = createActor(relayMachine).start()
    const emitted: Array<EditorSelection> = []
    relayActor.on('selection', (event) => {
      emitted.push(event.selection)
    })

    relayActor.send({type: 'selection', selection})
    relayActor.send({type: 'selection', selection})

    expect(emitted).toEqual([selection])
  })

  test('a repeated selection is re-emitted right after a focused event', () => {
    const relayActor = createActor(relayMachine).start()
    const emitted: Array<EditorSelection> = []
    relayActor.on('selection', (event) => {
      emitted.push(event.selection)
    })

    relayActor.send({type: 'selection', selection})
    relayActor.send({
      type: 'focused',
      event: {} as never,
    })
    relayActor.send({type: 'selection', selection})

    expect(emitted).toEqual([selection, selection])
  })

  test('a repeated selection after a non-focus event stays deduped', () => {
    const relayActor = createActor(relayMachine).start()
    const emitted: Array<EditorSelection> = []
    relayActor.on('selection', (event) => {
      emitted.push(event.selection)
    })

    relayActor.send({type: 'selection', selection})
    relayActor.send({type: 'ready'})
    relayActor.send({type: 'selection', selection})

    expect(emitted).toEqual([selection])
  })
})
