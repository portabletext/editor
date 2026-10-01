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
          host: 'plain',
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
          messages: [
            {
              route: 'host to io',
              type: 'load',
              value: [
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
            {
              route: 'io to editor',
              type: 'load',
              value: [
                {
                  _type: 'block',
                  _key: 'd-k0',
                  children: [
                    {_key: 'd-k1', _type: 'span', text: 'foo', marks: []},
                  ],
                  style: 'normal',
                },
              ],
            },
            {
              route: 'io to host',
              type: 'mutation',
              id: 'A-1',
              transactionId: 'A-t1',
              patches: [diffMatchPatch('foo', 'foox', textPath)],
            },
          ],
        },
        'Editor B': {
          id: 'B',
          host: 'plain',
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
          messages: [
            {
              route: 'host to io',
              type: 'load',
              value: [
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
            {
              route: 'io to editor',
              type: 'load',
              value: [
                {
                  _type: 'block',
                  _key: 'd-k0',
                  children: [
                    {_key: 'd-k1', _type: 'span', text: 'foo', marks: []},
                  ],
                  style: 'normal',
                },
              ],
            },
            {
              route: 'io to host',
              type: 'mutation',
              id: 'B-1',
              transactionId: 'B-t1',
              patches: [set('h1', stylePath)],
            },
            {
              route: 'host to io',
              type: 'transaction',
              via: 'feed',
              transactionId: 'other-field-1',
              previousRev: 'r2',
              resultRev: 'r3',
              patches: [],
            },
          ],
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
        carriesServerCopy: false,
        now: 0,
      },
    })
  })

  test('a self-confirming host forwards the transaction its save answers with', () => {
    const world = createWorld()

    world.setHostShape('self-confirming')
    world.documentIs('B: foo|')
    world.type('Editor A', 'x')
    world.receive('Editor A', 1)

    expect(
      world.snapshot().editors?.['Editor A'].messages.map((message) =>
        message.type === 'transaction'
          ? {
              route: message.route,
              type: message.type,
              via: message.via,
              transactionId: message.transactionId,
            }
          : {route: message.route, type: message.type},
      ),
    ).toEqual([
      {route: 'host to io', type: 'load'},
      {route: 'io to editor', type: 'load'},
      {route: 'io to host', type: 'mutation'},
      {
        route: 'host to io',
        type: 'transaction',
        via: 'save reply',
        transactionId: 'A-t1',
      },
      {route: 'io to editor', type: 'apply'},
    ])
  })

  test('a resync after `feed lost` re-submits the batch in flight, and the 409 is on the path', () => {
    const world = createWorld()

    world.documentIs('B: foo|')
    world.type('Editor A', 'x')
    world.receive('Editor A', 1)
    world.feedLost('Editor A')
    world.resync('Editor A', {discardUnsent: false, outcomeOf: 1})

    expect(
      world
        .snapshot()
        .editors?.['Editor A'].messages.slice(3)
        .map((message) =>
          message.type === 're-submit'
            ? message
            : message.type === 'resync' && message.route === 'host to io'
              ? {
                  route: message.route,
                  type: message.type,
                  rev: message.rev,
                  outcomes: message.outcomes,
                }
              : {route: message.route, type: message.type},
        ),
    ).toEqual([
      {route: 'host to io', type: 'feed lost'},
      {
        route: 'host to server',
        type: 're-submit',
        transactionId: 'A-t1',
        answer: {type: 'duplicate'},
      },
      {
        route: 'host to io',
        type: 'resync',
        rev: 'r2',
        outcomes: {'A-1': 'applied'},
      },
      {route: 'io to editor', type: 'resync'},
    ])
  })

  test("a snapshot writes stored blocks textspec can't spell as JSON", () => {
    const world = createWorld()

    world.serverHas('B _key="k1": foo;;B _key="k2": bar')
    world.corruptServerBlock('k1', {type: 'string', value: 'oops'})
    world.corruptServerBlock('k2', {type: 'no type'})
    world.startEditors()
    world.load('Editor A')

    const snapshot = world.snapshot()

    expect({
      server: snapshot.server?.value,
      base: snapshot.editors?.['Editor A'].base.textspec,
    }).toEqual({
      server:
        '"oops";;{"_key":"k2","children":[{"_key":"d-k1","_type":"span","text":"bar","marks":[]}],"style":"normal"}',
      base: '"oops";;{"_key":"k2","children":[{"_key":"d-k1","_type":"span","text":"bar","marks":[]}],"style":"normal"}',
    })
  })

  test("an editor's tree apart from io's working copy is reported for the moment it happened and for every step it lasts", () => {
    const world = createWorld()

    world.documentIs('B: foo|')

    expect(world.takeTreeMismatches()).toEqual([])

    world.getEditor('Editor A').document.send({
      type: 'apply',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
      underneath: [],
    })
    world.type('Editor A', 'x')

    expect(world.takeTreeMismatches()).toEqual([
      {
        editor: 'Editor A',
        after: 'local change',
        tree: 'H1 _key="d-k0": foox',
        workingCopy: 'B _key="d-k0": foox',
      },
      {
        editor: 'Editor A',
        after: 'the step',
        tree: 'H1 _key="d-k0": foox',
        workingCopy: 'B _key="d-k0": foox',
      },
    ])
    expect(world.takeTreeMismatches()).toEqual([
      {
        editor: 'Editor A',
        after: 'the step',
        tree: 'H1 _key="d-k0": foox',
        workingCopy: 'B _key="d-k0": foox',
      },
    ])
  })
})
