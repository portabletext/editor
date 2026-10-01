import {diffMatchPatch, set} from '@portabletext/patches'
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

    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const stylePath = [{_key: 'd-k0'}, 'style']

    expect(world.snapshot()).toEqual({
      editors: {
        'Editor A': {
          id: 'A',
          status: 'ready',
          sync: 'saving',
          screen: 'B: fooxy|',
          blocks: [
            {
              _type: 'block',
              _key: 'd-k0',
              children: [
                {_key: 'd-k1', _type: 'span', text: 'fooxy', marks: []},
              ],
              style: 'normal',
            },
          ],
          base: {
            textspec: 'B: foo',
            blocks: [
              {
                _type: 'block',
                _key: 'd-k0',
                children: [
                  {_key: 'd-k1', _type: 'span', text: 'foo', marks: []},
                ],
                style: 'normal',
              },
            ],
            rev: 'r1',
          },
          inFlight: {
            batchNumber: 1,
            transactionIds: ['A-t1'],
            patchCount: 1,
            patches: [diffMatchPatch('foo', 'foox', textPath)],
          },
          rejected: null,
          echoed: [],
          pending: [
            {
              patchCount: 1,
              patches: [diffMatchPatch('foox', 'fooxy', textPath)],
            },
          ],
          held: [],
          outOfStep: false,
          readOnly: false,
          undoDepth: 2,
          sentBatches: [
            {
              number: 1,
              transactionId: 'A-t1',
              patchCount: 1,
              patches: [diffMatchPatch('foo', 'foox', textPath)],
              final: false,
            },
          ],
          events: [
            {type: 'change', origin: 'local', patchCount: 1},
            {type: 'change', origin: 'local', patchCount: 1},
          ],
        },
        'Editor B': {
          id: 'B',
          status: 'ready',
          sync: 'saving',
          screen: 'H1: foo|',
          blocks: [
            {
              _type: 'block',
              _key: 'd-k0',
              children: [{_key: 'd-k1', _type: 'span', text: 'foo', marks: []}],
              style: 'h1',
            },
          ],
          base: {
            textspec: 'B: foo',
            blocks: [
              {
                _type: 'block',
                _key: 'd-k0',
                children: [
                  {_key: 'd-k1', _type: 'span', text: 'foo', marks: []},
                ],
                style: 'normal',
              },
            ],
            rev: 'r1',
          },
          inFlight: {
            batchNumber: 1,
            transactionIds: ['B-t1'],
            patchCount: 1,
            patches: [set('h1', stylePath)],
          },
          rejected: null,
          echoed: [],
          pending: [],
          held: [
            {
              transactionId: 'other-field-1',
              previousRev: 'r2',
              resultRev: 'r3',
              patches: [],
            },
          ],
          outOfStep: false,
          readOnly: false,
          undoDepth: 1,
          sentBatches: [
            {
              number: 1,
              transactionId: 'B-t1',
              patchCount: 1,
              patches: [set('h1', stylePath)],
              final: false,
            },
          ],
          events: [{type: 'change', origin: 'local', patchCount: 1}],
        },
      },
      server: {
        value: 'B: foox',
        blocks: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_key: 'd-k1', _type: 'span', text: 'foox', marks: []}],
            style: 'normal',
          },
        ],
        rev: 'r3',
        transactions: [
          {
            id: 'A-t1',
            previousRev: 'r1',
            resultRev: 'r2',
            batchIds: ['A-1'],
            patchCount: 1,
            patches: [diffMatchPatch('foo', 'foox', textPath)],
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
            patches: [],
            noop: true,
            source: {type: 'named', name: 'the other field'},
          },
        ],
        duplicates: [],
        nextFailure: null,
      },
      network: {
        saveRequests: [
          {
            editor: 'Editor B',
            batchId: 'B-1',
            batchNumber: 1,
            final: false,
            patchCount: 1,
            patches: [set('h1', stylePath)],
          },
        ],
        replies: [],
        lostReplies: [],
        feeds: {
          'Editor A': [
            {
              transactionId: 'A-t1',
              previousRev: 'r1',
              resultRev: 'r2',
              batchIds: ['A-1'],
              patchCount: 1,
              patches: [diffMatchPatch('foo', 'foox', textPath)],
              source: {
                type: 'batches',
                batches: [{name: 'Editor A', batchNumber: 1}],
              },
            },
            {
              transactionId: 'other-field-1',
              previousRev: 'r2',
              resultRev: 'r3',
              batchIds: [],
              patchCount: 0,
              patches: [],
              source: {type: 'named', name: 'the other field'},
            },
          ],
          'Editor B': [
            {
              transactionId: 'A-t1',
              previousRev: 'r1',
              resultRev: 'r2',
              batchIds: ['A-1'],
              patchCount: 1,
              patches: [diffMatchPatch('foo', 'foox', textPath)],
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
