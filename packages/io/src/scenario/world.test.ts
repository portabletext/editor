import {describe, expect, test} from 'vitest'
import {createWorld} from './world'

describe(createWorld.name, () => {
  test('a snapshot before the editors exist has no parts', () => {
    const world = createWorld()

    world.serverHas('B: foo')

    expect(world.snapshot()).toEqual({
      editors: null,
      server: null,
      network: null,
    })
  })

  test('a snapshot shows the editors, the server and the network as plain data', () => {
    const world = createWorld()

    world.documentIs('B: foo|')
    world.type('Editor A', 'x')
    world.setStyle('Editor B', 'h1')
    world.receive('Editor A', 1)
    world.changeOtherField()
    world.deliverNamed('Editor B', 'the other field')
    world.type('Editor A', 'y')

    expect(world.snapshot()).toEqual({
      editors: {
        'Editor A': {
          id: 'A',
          status: 'ready',
          screen: 'B: fooxy|',
          base: {textspec: 'B: foo', rev: 'r1'},
          inFlight: {batchNumber: 1, transactionId: 'A-1', patchCount: 1},
          rejected: null,
          echoed: [],
          pending: [{patchCount: 1}],
          held: [],
          outOfStep: false,
          readOnly: false,
          sentBatches: [
            {number: 1, transactionId: 'A-1', patchCount: 1, final: false},
          ],
          events: [
            {type: 'change', origin: 'local', patchCount: 1},
            {type: 'change', origin: 'local', patchCount: 1},
          ],
        },
        'Editor B': {
          id: 'B',
          status: 'ready',
          screen: 'H1: foo|',
          base: {textspec: 'B: foo', rev: 'r1'},
          inFlight: {batchNumber: 1, transactionId: 'B-1', patchCount: 1},
          rejected: null,
          echoed: [],
          pending: [],
          held: [
            {
              transactionId: 'other-field-1',
              previousRev: 'r2',
              resultRev: 'r3',
            },
          ],
          outOfStep: false,
          readOnly: false,
          sentBatches: [
            {number: 1, transactionId: 'B-1', patchCount: 1, final: false},
          ],
          events: [{type: 'change', origin: 'local', patchCount: 1}],
        },
      },
      server: {
        value: 'B: foox',
        rev: 'r3',
        transactions: [
          {
            id: 'A-1',
            previousRev: 'r1',
            resultRev: 'r2',
            batchIds: ['A-1'],
            patchCount: 1,
            noop: false,
            source: {
              type: 'batches',
              batches: [{name: 'Editor A', batchNumber: 1}],
            },
          },
          {
            id: 'other-field-1',
            previousRev: 'r2',
            resultRev: 'r3',
            batchIds: [],
            patchCount: 0,
            noop: true,
            source: {type: 'named', name: 'the other field'},
          },
        ],
      },
      network: {
        saveRequests: [
          {
            editor: 'Editor B',
            batchId: 'B-1',
            batchNumber: 1,
            final: false,
            patchCount: 1,
          },
        ],
        replies: [
          {
            editor: 'Editor A',
            batchId: 'A-1',
            batchNumber: 1,
            outcome: 'accepted',
          },
        ],
        feeds: {
          'Editor A': [
            {
              transactionId: 'A-1',
              previousRev: 'r1',
              resultRev: 'r2',
              patchCount: 1,
              source: {
                type: 'batches',
                batches: [{name: 'Editor A', batchNumber: 1}],
              },
            },
            {
              transactionId: 'other-field-1',
              previousRev: 'r2',
              resultRev: 'r3',
              patchCount: 0,
              source: {type: 'named', name: 'the other field'},
            },
          ],
          'Editor B': [
            {
              transactionId: 'A-1',
              previousRev: 'r1',
              resultRev: 'r2',
              patchCount: 1,
              source: {
                type: 'batches',
                batches: [{name: 'Editor A', batchNumber: 1}],
              },
            },
          ],
        },
        now: 0,
      },
    })
  })
})
