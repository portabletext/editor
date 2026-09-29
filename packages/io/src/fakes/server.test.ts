import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from '../document'
import {createServer} from './server'

describe(createServer.name, () => {
  test('an existing document starts at the first revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})

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
    const server = createServer({documentId: 'document', document: undefined})

    expect(server.copy()).toEqual({value: undefined, rev: undefined})
  })

  test('a batch that changes nothing is still recorded and moves the revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'H1: foo')
    const server = createServer({documentId: 'document', document: {value}})

    const transaction = server.receive(
      {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]},
      't1',
    )

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'k0'}, 'style'])],
      batchIds: ['b1'],
    })
    expect(server.getTransactions()).toEqual([transaction])
    expect(server.copy()).toEqual({value, rev: 'r2'})
  })

  test('a patch for a block that is gone does nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})

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
    const server = createServer({
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
    const server = createServer({documentId: 'document', document: {value}})
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

  test('a batch for a missing document creates it', () => {
    const server = createServer({documentId: 'document', document: undefined})
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
      batchIds: ['b1'],
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

  test('two batches received as one are one transaction', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo;;B: bar')
    const server = createServer({documentId: 'document', document: {value}})
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

    const transaction = server.receiveAsOne(
      {id: 'a1', patches: [fooPatch]},
      {id: 'b1', patches: [barPatch]},
      't1',
    )

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [fooPatch, barPatch],
      batchIds: ['a1', 'b1'],
    })
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
    const server = createServer({documentId: 'document', document: {value}})
    const batch = {id: 'b1', patches: [set('h1', [{_key: 'k0'}, 'style'])]}

    const first = server.submit(batch, 't1')
    const retry = server.submit(batch, 't1')

    expect({first, retry}).toEqual({
      first: {
        type: 'saved',
        transaction: {
          transactionId: 't1',
          previousRev: 'r1',
          resultRev: 'r2',
          patches: [set('h1', [{_key: 'k0'}, 'style'])],
          batchIds: ['b1'],
        },
      },
      retry: {type: 'duplicate'},
    })
    expect(server.getTransactions().length).toEqual(1)
    expect(server.getDuplicates()).toEqual([
      {transactionId: 't1', batchIds: ['b1']},
    ])
    expect([server.hasTransaction('t1'), server.hasTransaction('t2')]).toEqual([
      true,
      false,
    ])
    expect(server.copy().rev).toEqual('r2')
    expect(() => server.receive(batch, 't1')).toThrow(
      'Transaction "t1" already exists',
    )
  })

  test('a refused batch records nothing', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})

    server.refuse('b1')

    expect(server.isRefused('b1')).toEqual(true)
    expect(server.isRefused('b2')).toEqual(false)
    expect(server.getTransactions()).toEqual([])
    expect(server.copy()).toEqual({value, rev: 'r1'})
  })

  test('a change to another field moves the revision with no field patches', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})

    expect(server.changeOtherField('t1')).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [],
      batchIds: [],
    })
    expect(server.copy()).toEqual({value, rev: 'r2'})
  })

  test('setting the whole field records a whole-field set and moves the revision', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})
    const nextValue = parseTextspec({keyGenerator}, 'B: bar').value

    const transaction = server.setField(nextValue, 't1')

    expect(transaction).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set(nextValue, [])],
      batchIds: [],
    })
    expect(server.copy()).toEqual({value: nextValue, rev: 'r2'})
    expect(server.getLog()).toEqual([{transaction, changesField: true}])
  })

  test('setting the whole field of a missing document throws', () => {
    const keyGenerator = createTestKeyGenerator()
    const server = createServer({documentId: 'document', document: undefined})

    expect(() =>
      server.setField(parseTextspec({keyGenerator}, 'B: bar').value, 't1'),
    ).toThrow('The document does not exist')
  })

  test('deleting and recreating the document', () => {
    const keyGenerator = createTestKeyGenerator()
    const {value} = parseTextspec({keyGenerator}, 'B: foo')
    const server = createServer({documentId: 'document', document: {value}})
    const recreatedValue = parseTextspec({keyGenerator}, 'B: bar').value

    const deletion = server.deleteDocument('t1')

    expect(deletion).toEqual({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: undefined,
      patches: [unset([])],
      batchIds: [],
    })
    expect(server.copy()).toEqual({value: undefined, rev: undefined})

    const recreation = server.recreate(recreatedValue, 't2')

    expect(recreation).toEqual({
      transactionId: 't2',
      previousRev: undefined,
      resultRev: 'r2',
      patches: [set(recreatedValue, [])],
      batchIds: [],
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
    const server = createServer({documentId: 'document', document: {value}})

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
    const server = createServer({documentId: 'document', document: {value}})

    const copy = server.copy()
    copy.value?.pop()

    expect(server.copy()).toEqual({value, rev: 'r1'})
  })
})
