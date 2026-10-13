import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from './document'
import {createFakeServer} from './server'

describe(createFakeServer.name, () => {
  test('an existing document starts at the first revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r1',
    })
    expect(server.getTransactions()).toEqual([])
  })

  test('a missing document has no revision', () => {
    const server = createFakeServer({
      documentId: 'document',
      document: undefined,
    })

    expect(server.copy()).toEqual({value: undefined, rev: undefined})
  })

  test('a mutation that changes nothing is still recorded and moves the revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'H1: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    const transaction = server.receive(
      {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]},
      't1',
    )

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'k0'}, 'style'])],
      mutationIds: ['b1'],
    })
    expect(server.getTransactions()).toEqual([transaction])
    expect(server.copy()).toEqual({value, rev: 'r2'})
  })

  test('a patch for a block that is gone does nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    const transaction = server.receive(
      {
        id: 'b1',
        patches: [
          diffMatchPatch('bar', 'bary', [
            {_key: 'k9'},
            'children',
            {_key: 'k8'},
            'text',
          ]),
          set('h1', [{_key: 'k9'}, 'style']),
          unset([{_key: 'k9'}]),
          insert([value[0]], 'after', [{_key: 'k9'}]),
        ],
      },
      't1',
    )

    expect(transaction.resultRev).toEqual('r2')
    expect(server.copy()).toEqual({value, rev: 'r2'})
  })

  test('a patch into a field that is gone does nothing', () => {
    const server = createFakeServer({
      documentId: 'document',
      document: {value: undefined},
    })

    server.receive(
      {
        id: 'b1',
        patches: [
          diffMatchPatch('foo', 'foox', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
          set('h1', [{_key: 'k0'}, 'style']),
          unset([{_key: 'k0'}]),
          insert([], 'before', [0]),
        ],
      },
      't1',
    )

    expect(server.copy()).toEqual({value: undefined, rev: 'r2'})
  })

  test('an insert with a key that already exists is stored', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;B _key="k9": baz')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const [barBlock] = parseTextspec({keyGenerator}, 'B _key="k9": bar').value

    server.receive(
      {id: 'b1', patches: [insert([barBlock], 'after', [{_key: 'k9'}])]},
      't1',
    )

    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k9',
          children: [{_type: 'span', _key: 'k2', text: 'baz', marks: []}],
          style: 'normal',
        },
        barBlock,
      ],
      rev: 'r2',
    })
  })

  test('a mutation for a missing document creates it', () => {
    const server = createFakeServer({
      documentId: 'document',
      document: undefined,
    })
    const keyGenerator = createTestKeyGenerator()
    const [placeholder] = parseTextspec({keyGenerator}, 'B: ').value
    const patches = [
      setIfMissing([], []),
      insert([placeholder], 'before', [0]),
      diffMatchPatch('', 'x', [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text']),
    ]

    const transaction = server.receive({id: 'b1', patches}, 't1')

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: undefined,
      resultRev: 'r1',
      patches,
      mutationIds: ['b1'],
    })
    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'x', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r1',
    })
  })

  test('two mutations received as one are one transaction', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;B: bar')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const fooPatch = diffMatchPatch('foo', 'foox', [
      {_key: 'k0'},
      'children',
      {_key: 'k1'},
      'text',
    ])
    const barPatch = diffMatchPatch('bar', 'bary', [
      {_key: 'k2'},
      'children',
      {_key: 'k3'},
      'text',
    ])

    const result = server.submit(
      [
        {id: 'a1', patches: [fooPatch]},
        {id: 'b1', patches: [barPatch]},
      ],
      't1',
    )
    const transaction = {
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [fooPatch, barPatch],
      mutationIds: ['a1', 'b1'],
    }

    expect(result).toEqual({type: 'saved', transaction})
    expect(server.getTransactions()).toEqual([transaction])
    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bary', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r2',
    })
  })

  test('a save request with a transaction ID the history lists is refused with a 409 and changes nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const mutation = {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]}

    const first = server.submit([mutation], 't1')
    const retry = server.submit([mutation], 't1')

    expect({first, retry}).toEqual({
      first: {
        type: 'saved',
        transaction: {
          transactionId: 't1',
          previousRev: 'r1',
          resultRev: 'r2',
          patches: [set('h1', [{_key: 'k0'}, 'style'])],
          mutationIds: ['b1'],
        },
      },
      retry: {type: 'duplicate'},
    })
    expect(server.getTransactions()).toEqual([
      {
        transactionId: 't1',
        previousRev: 'r1',
        resultRev: 'r2',
        patches: [set('h1', [{_key: 'k0'}, 'style'])],
        mutationIds: ['b1'],
      },
    ])
    expect(server.getDuplicates()).toEqual([
      {transactionId: 't1', mutationIds: ['b1']},
    ])
    expect([server.hasTransaction('t1'), server.hasTransaction('t2')]).toEqual([
      true,
      false,
    ])
    expect(server.copy().rev).toEqual('r2')
    expect(() => server.receive(mutation, 't1')).toThrow(
      'Transaction "t1" already exists',
    )
  })

  test('an injected failure fails the next request only, whatever it carries, and records nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const mutation = {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]}

    server.failNextRequest(503)
    const failed = server.submit([mutation], 't1')
    const failedCopy = server.copy()
    const retried = server.submit([mutation], 't1')

    expect({failed, failedCopy, retried}).toEqual({
      failed: {type: 'failed', status: 503},
      failedCopy: {value, rev: 'r1'},
      retried: {
        type: 'saved',
        transaction: {
          transactionId: 't1',
          previousRev: 'r1',
          resultRev: 'r2',
          patches: [set('h1', [{_key: 'k0'}, 'style'])],
          mutationIds: ['b1'],
        },
      },
    })
    expect(server.getDuplicates()).toEqual([])
    expect(server.getNextFailure()).toEqual(undefined)
  })

  test('a change to another field moves the revision with no field patches', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    expect(server.changeOtherField('t1')).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [],
      mutationIds: [],
    })
    expect(server.copy()).toEqual({value, rev: 'r2'})
  })

  test('setting the whole field records a whole-field set and moves the revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const nextValue = parseTextspec({keyGenerator}, 'B: bar').value

    const transaction = server.setField(nextValue, 't1')

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set(nextValue, [])],
      mutationIds: [],
    })
    expect(server.copy()).toEqual({value: nextValue, rev: 'r2'})
    expect(server.getLog()).toEqual([{transaction, changesField: true}])
  })

  test("a script's patches are stored whatever they leave behind, as Content Lake stores them", () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;B: bar;;B: baz')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const patches = [
      unset([{_key: 'k0'}, '_key']),
      unset([1, '_type']),
      set(42, [1, 'children', {_key: 'k3'}, 'text']),
      set('oops', [{_key: 'k4'}, 'children']),
      set('oops', [{_key: 'k4'}]),
    ]

    const transaction = server.patchField(patches, 't1')

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches,
      mutationIds: [],
    })
    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          style: 'normal',
        },
        {
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 42, marks: []}],
          style: 'normal',
        },
        'oops',
      ],
      rev: 'r2',
    })
  })

  test('setting the whole field of a missing document throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const server = createFakeServer({
      documentId: 'document',
      document: undefined,
    })

    expect(() =>
      server.setField(parseTextspec({keyGenerator}, 'B: bar').value, 't1'),
    ).toThrow('The document does not exist')
  })

  test('Scenario: the stored copy of a document with no transaction yet can be altered', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    server.alterStoredCopy([set('h1', [{_key: 'k0'}, 'style'])])

    expect({
      transactions: server.getTransactions(),
      copy: server.copy(),
    }).toEqual({
      transactions: [],
      copy: {value: [{...value[0], style: 'h1'}], rev: 'r1'},
    })
  })

  test('the copy after each transaction is kept, and altering the stored copy changes the field without a transaction', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})
    server.patchField([set('h1', [{_key: 'k0'}, 'style'])], 't1')

    server.patchField([set('h2', [{_key: 'k0'}, 'style'])], 't2')
    server.alterStoredCopy([
      set('foox', [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text']),
    ])

    expect({
      transactions: server
        .getTransactions()
        .map((transaction) => transaction.transactionId),
      first: server.getCopyAfter('t1'),
      latest: server.getCopyAfter('t2'),
      copy: server.copy(),
    }).toEqual({
      transactions: ['t1', 't2'],
      first: [{...value[0], style: 'h1'}],
      latest: [
        {
          ...value[0],
          style: 'h2',
          children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
        },
      ],
      copy: {
        value: [
          {
            ...value[0],
            style: 'h2',
            children: [{_type: 'span', _key: 'k1', text: 'foox', marks: []}],
          },
        ],
        rev: 'r3',
      },
    })
    expect(() => server.getCopyAfter('t9')).toThrow('No transaction "t9"')
  })

  test('deleting and recreating the document', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})
    const recreatedValue = parseTextspec({keyGenerator}, 'B: bar').value

    const deletion = server.deleteDocument('t1')

    expect(deletion).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: undefined,
      patches: [unset([])],
      mutationIds: [],
    })
    expect(server.copy()).toEqual({value: undefined, rev: undefined})

    const recreation = server.recreate(recreatedValue, 't2')

    expect(recreation).toEqual({
      transactionId: 't2',
      previousRev: undefined,
      resultRev: 'r2',
      patches: [set(recreatedValue, [])],
      mutationIds: [],
    })
    expect(server.copy()).toEqual({
      value: [
        {
          _type: 'block',
          _key: 'k2',
          children: [{_type: 'span', _key: 'k3', text: 'bar', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r2',
    })
    expect(server.getTransactions()).toEqual([deletion, recreation])
    expect(server.getTransaction('t2')).toEqual(recreation)
  })

  test('the log marks the transactions that left the field as it was', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'H1: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    const unchanged = server.receive(
      {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]},
      't1',
    )
    const changed = server.receive(
      {id: 'b2', patches: [set('h2', [{_key: 'k0'}, 'style'])]},
      't2',
    )
    const otherField = server.changeOtherField('t3')
    const deletion = server.deleteDocument('t4')

    expect(server.getLog()).toEqual([
      {transaction: unchanged, changesField: false},
      {transaction: changed, changesField: true},
      {transaction: otherField, changesField: false},
      {transaction: deletion, changesField: true},
    ])
  })

  test('a copy does not share content with the server', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createFakeServer({documentId: 'document', document: {value}})

    const copy = server.copy()
    copy.value?.pop()

    expect(server.copy()).toEqual({value, rev: 'r1'})
  })
})
