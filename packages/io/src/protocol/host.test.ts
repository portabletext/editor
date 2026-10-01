import {diffMatchPatch, set} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from '../fakes/document'
import {createFakeNetwork} from '../fakes/network'
import {createEditorWithIo, createWorld} from '../scenario/world'
import {createPassThroughHost, type RequestFailure} from './host'
import type {Load, MutationBatch, MutationSent, Transaction} from './types'

describe(createPassThroughHost.name, () => {
  test('a transaction the resync copy covers is dropped, and the next one is forwarded', () => {
    const {editor, document, host, heard, clock, feed, serverCopy} =
      createHostedEditor('B: foo|')
    const coveredTransaction: Transaction = {
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    }
    const nextTransaction: Transaction = {
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h2', [{_key: 'd-k0'}, 'style'])],
    }

    feed.push(coveredTransaction)
    serverCopy.current = {
      value: parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'H1: foo',
      ).value,
      rev: 'r2',
    }
    host.resync({discardUnsent: false})
    host.forward(coveredTransaction)
    clock.advance(10_000)

    expect(heard.errors).toEqual([])
    expect(editor.getBase().rev).toEqual('r2')
    expect(document.toTextspec()).toEqual('H1: foo|')

    host.forward(nextTransaction)

    expect(editor.getBase().rev).toEqual('r3')
    expect(document.toTextspec()).toEqual('H2: foo|')
  })

  test('a transaction delivered late is dropped when a transaction the editor held links it to the resync copy', () => {
    const {editor, document, host, heard, clock, feed, serverCopy} =
      createHostedEditor('B: foo|')
    const firstTransaction: Transaction = {
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    }
    const secondTransaction: Transaction = {
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h2', [{_key: 'd-k0'}, 'style'])],
    }

    feed.push(firstTransaction)
    host.forward(secondTransaction)
    serverCopy.current = {
      value: parseTextspec(
        {keyGenerator: createTestKeyGenerator('d-')},
        'H2: foo',
      ).value,
      rev: 'r3',
    }
    host.resync({discardUnsent: false})
    host.forward(firstTransaction)
    clock.advance(10_000)

    expect(heard.errors).toEqual([])
    expect(editor.getBase().rev).toEqual('r3')
    expect(document.toTextspec()).toEqual('H2: foo|')
  })

  test('a transaction that skips ahead after the load reaches the editor', () => {
    const {editor, document, host, heard} = createHostedEditor('B: foo|')

    host.forward({
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [set('h2', [{_key: 'd-k0'}, 'style'])],
    })
    host.forward({
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'd-k0'}, 'style'])],
    })

    expect(heard.errors).toEqual([])
    expect(editor.getBase().rev).toEqual('r3')
    expect(document.toTextspec()).toEqual('H2: foo|')
  })

  test('a plain host saves each batch under the transaction ID it proposes and sends no `mutation sent`', () => {
    const {editor, document, host, heard, mutationsSent} =
      createHostedEditor('B: foo|')

    document.type('x')
    host.reportSaveTaken('A-1')

    expect({
      transactionId: host.getTransactionId('A-1'),
      inFlight: editor.inspect().inFlight,
      mutationsSent,
      warnings: heard.warnings,
    }).toEqual({
      transactionId: 'A-t1',
      inFlight: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
      mutationsSent: [],
      warnings: [],
    })
    expect(() =>
      host.foldIntoRequest('A-1', {
        transactionId: 'A-1+B-1',
        batches: heard.mutations,
      }),
    ).toThrow(
      'A host that saves each batch under its proposed transaction ID never folds batches into one request',
    )
  })

  test('a folding host names the request a batch went out in once, when the request is formed', () => {
    const results = [true, false].map((folded) => {
      const {editor, document, host, heard, mutationsSent} = createHostedEditor(
        'B: foo|',
        {foldBatches: true},
      )

      document.type('x')
      const transactionIdsBefore = editor.inspect().inFlight?.transactionIds

      if (folded) {
        host.foldIntoRequest('A-1', {
          transactionId: 'A-1+B-1',
          batches: heard.mutations,
        })
      }

      host.reportSaveTaken('A-1')

      return {
        transactionIdsBefore,
        transactionIdsAfter: editor.inspect().inFlight?.transactionIds,
        savedAs: host.getTransactionId('A-1'),
        mutationsSent,
        warnings: heard.warnings,
      }
    })

    expect(results).toEqual([
      {
        transactionIdsBefore: ['A-t1'],
        transactionIdsAfter: ['A-1+B-1'],
        savedAs: 'A-1+B-1',
        mutationsSent: [{id: 'A-1', transactionId: 'A-1+B-1'}],
        warnings: [],
      },
      {
        transactionIdsBefore: ['A-t1'],
        transactionIdsAfter: ['A-1'],
        savedAs: 'A-1',
        mutationsSent: [{id: 'A-1', transactionId: 'A-1'}],
        warnings: [],
      },
    ])
  })

  test('a retry re-sends the save request with the transaction ID the batch was first sent as', () => {
    const results = [true, false].map((landed) => {
      const {editor, document, host, heard, resubmitted, transactionHistory} =
        createHostedEditor('B: foo|')

      document.type('x')
      host.reportSaveTaken('A-1')

      if (landed) {
        transactionHistory.add('A-t1')
      }

      return {
        answer: host.retry('A-1'),
        resubmitted,
        warnings: heard.warnings,
        transactionIds: editor.inspect().inFlight?.transactionIds,
      }
    })

    expect(results).toEqual([
      {
        answer: {type: 'duplicate'},
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
        warnings: [],
        transactionIds: ['A-t1'],
      },
      {
        answer: {type: 'saved'},
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
        warnings: [],
        transactionIds: ['A-t1'],
      },
    ])
  })

  test('a permanent failure is reported as `mutation rejected`, and a transient one is retried with the same request until it is answered', () => {
    const results = (
      [[400], [403], [404], [500], [503], ['network error', 503]] as const
    ).map(([failure, ...retryFailures]) => {
      const {editor, document, host, heard, resubmitted, failures} =
        createHostedEditor('B: foo|')

      document.type('x')
      host.reportSaveTaken('A-1')
      failures.push(...retryFailures)
      host.reportFailure('A-1', failure)

      return {
        failure,
        sync: editor.getSync(),
        rejected: editor.inspect().rejected,
        resubmitted,
        warnings: heard.warnings,
      }
    })
    const rejected = {
      sync: 'blocked',
      rejected: {id: 'A-1', transactionIds: ['A-t1'], patchCount: 1},
      resubmitted: [],
      warnings: [],
    }
    const retried = {
      sync: 'saving',
      rejected: undefined,
      warnings: [],
    }

    expect(results).toEqual([
      {failure: 400, ...rejected},
      {failure: 403, ...rejected},
      {failure: 404, ...rejected},
      {
        failure: 500,
        ...retried,
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
      },
      {
        failure: 503,
        ...retried,
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
      },
      {
        failure: 'network error',
        ...retried,
        resubmitted: [
          {batchIds: ['A-1'], transactionId: 'A-t1'},
          {batchIds: ['A-1'], transactionId: 'A-t1'},
        ],
      },
    ])
  })

  test('a folding host that re-submits a batch before its request arrives saves the batch once, under one transaction ID', () => {
    const world = createWorld()
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const batch = {name: 'Editor A', batchNumber: 1} as const

    world.setHostShape('folding')
    world.documentIs('B: foo|')
    world.type('Editor A', 'x')
    world.feedLost('Editor A')
    world.resync('Editor A', {discardUnsent: false, outcomeOf: 1})
    world.receive('Editor A', 1)

    expect(world.getEditor('Editor A').mutationsSent).toEqual([
      {id: 'A-1', transactionId: 'A-1'},
    ])
    expect(world.snapshot().server).toEqual({
      value: 'B: foox',
      blocks: [
        {
          _type: 'block',
          _key: 'd-k0',
          children: [{_key: 'd-k1', _type: 'span', text: 'foox', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r2',
      transactions: [
        {
          id: 'A-1',
          previousRev: 'r1',
          resultRev: 'r2',
          batchIds: ['A-1'],
          patchCount: 1,
          patches: [diffMatchPatch('foo', 'foox', textPath)],
          noop: false,
          source: {type: 'batches', batches: [batch]},
        },
      ],
      duplicates: [{transactionId: 'A-1', batches: [batch]}],
      nextFailure: null,
    })
  })

  test('a shared request retried before it lands saves both batches once', () => {
    const world = createWorld()
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']
    const batchA = {name: 'Editor A', batchNumber: 1} as const
    const batchB = {name: 'Editor B', batchNumber: 1} as const

    world.setHostShape('folding')
    world.documentIs('B: foo|')
    world.type('Editor A', 'x')
    world.putCaretAfter('Editor B', 'f')
    world.type('Editor B', 'y')
    world.foldAsOne(batchA, batchB)
    world.getEditor('Editor A').host.retry('A-1')
    world.receiveAsOne(batchA, batchB)

    expect(world.snapshot().server).toEqual({
      value: 'B: fyoox',
      blocks: [
        {
          _type: 'block',
          _key: 'd-k0',
          children: [{_key: 'd-k1', _type: 'span', text: 'fyoox', marks: []}],
          style: 'normal',
        },
      ],
      rev: 'r2',
      transactions: [
        {
          id: 'A-1+B-1',
          previousRev: 'r1',
          resultRev: 'r2',
          batchIds: ['A-1', 'B-1'],
          patchCount: 2,
          patches: [
            diffMatchPatch('foo', 'foox', textPath),
            diffMatchPatch('foo', 'fyoo', textPath),
          ],
          noop: false,
          source: {type: 'batches', batches: [batchA, batchB]},
        },
      ],
      duplicates: [{transactionId: 'A-1+B-1', batches: [batchA, batchB]}],
      nextFailure: null,
    })
  })

  test('a resync naming the batch in flight finds its outcome by re-submitting it, or from the transaction history', () => {
    const cases = [
      {outcomeMethod: 'resubmit', server: 'landed'},
      {outcomeMethod: 'resubmit', server: 'never arrived'},
      {outcomeMethod: 'resubmit', server: 'fails with 404'},
      {outcomeMethod: 'history', server: 'landed'},
      {outcomeMethod: 'history', server: 'never arrived'},
    ] as const
    const results = cases.map(({outcomeMethod, server}) => {
      const {
        editor,
        document,
        host,
        heard,
        transactionHistory,
        failures,
        resubmitted,
      } = createHostedEditor('B: foo|', {outcomeMethod})
      const outcomes: Array<unknown> = []

      document.type('x')
      host.reportSaveTaken('A-1')
      document.type('y')

      if (server === 'landed') {
        transactionHistory.add('A-t1')
      }

      if (server === 'fails with 404') {
        failures.push(404)
      }

      const resync = editor.resync
      editor.resync = (incoming) => {
        outcomes.push(incoming.outcomes)
        resync(incoming)
      }
      host.resync({discardUnsent: false, outcomeOf: 'A-1'})

      return {outcomes, resubmitted, warnings: heard.warnings}
    })

    expect(results).toEqual([
      {
        outcomes: [{'A-1': 'applied'}],
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
        warnings: [],
      },
      {
        outcomes: [{'A-1': 'applied'}],
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
        warnings: [],
      },
      {
        outcomes: [{'A-1': 'not applied'}],
        resubmitted: [{batchIds: ['A-1'], transactionId: 'A-t1'}],
        warnings: [],
      },
      {
        outcomes: [{'A-1': 'applied'}],
        resubmitted: [],
        warnings: [],
      },
      {
        outcomes: [{'A-1': 'not applied'}],
        resubmitted: [],
        warnings: [],
      },
    ])
  })

  test('a self-confirming host forwards the transaction its save answers with, and a plain host waits for the feed', () => {
    const results = [true, false].map((selfConfirming) => {
      const {editor, document, host, heard} = createHostedEditor('B: foo|', {
        selfConfirming,
      })

      document.type('x')
      host.reportSaveTaken('A-1')
      host.reportSaved('A-1', {
        transactionId: 'A-t1',
        previousRev: 'r1',
        resultRev: 'r2',
        patches: heard.mutations[0].patches,
      })

      return {
        sync: editor.getSync(),
        rev: editor.getBase().rev,
        inFlight: editor.inspect().inFlight?.id,
      }
    })

    expect(results).toEqual([
      {sync: 'synced', rev: 'r2', inFlight: undefined},
      {sync: 'saving', rev: 'r1', inFlight: 'A-1'},
    ])
  })

  test('a self-confirming host passes on no answer for the final batch', () => {
    const {editor, document, host, heard} = createHostedEditor('B: foo|', {
      selfConfirming: true,
    })

    document.type('x')
    host.reportSaveTaken('A-1')
    document.type('y')
    document.close()
    host.reportSaved('A-2', {
      transactionId: 'A-t2',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: heard.mutations[1].patches,
    })

    expect({
      final: heard.mutations[1].final,
      warnings: heard.warnings,
      rev: editor.getBase().rev,
    }).toEqual({final: true, warnings: [], rev: 'r1'})
  })

  test('the final batch is saved once the save request of the batch in flight is taken', () => {
    const {document, host, saved} = createHostedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    document.type('y')
    document.close()

    expect(saved.length).toEqual(1)

    host.reportSaveTaken('A-1')

    expect(saved).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        final: true,
      },
    ])
  })

  test('the final batch is saved at once when no save request is waiting', () => {
    const {document, host, saved} = createHostedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    document.type('x')
    host.reportSaveTaken('A-1')
    document.type('y')
    document.close()

    expect(saved).toEqual([
      {
        id: 'A-1',
        transactionId: 'A-t1',
        patches: [diffMatchPatch('foo', 'foox', textPath)],
      },
      {
        id: 'A-2',
        transactionId: 'A-t2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        final: true,
      },
    ])
  })
})

function createHostedEditor(
  textspec: string,
  {
    foldBatches = false,
    selfConfirming = false,
    outcomeMethod,
  }: {
    foldBatches?: boolean
    selfConfirming?: boolean
    outcomeMethod?: 'resubmit' | 'history'
  } = {},
) {
  const {clock} = createFakeNetwork()
  const {
    document,
    io: editor,
    heard,
  } = createEditorWithIo({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
  })
  const {value, caret} = parseTextspec(
    {keyGenerator: createTestKeyGenerator('d-')},
    textspec,
  )
  const serverCopy: {current: Load} = {current: {value, rev: 'r1'}}
  const feed: Array<Transaction> = []
  const saved: Array<MutationBatch> = []
  const resubmitted: Array<{batchIds: Array<string>; transactionId: string}> =
    []
  const transactionHistory = new Set<string>()
  const failures: Array<RequestFailure> = []
  const mutationsSent: Array<MutationSent> = []
  const {mutationSent} = editor
  editor.mutationSent = (incoming) => {
    mutationsSent.push(incoming)
    mutationSent(incoming)
  }
  const host = createPassThroughHost({
    io: editor,
    save: (batch) => saved.push(batch),
    resubmit: ({transactionId, batches}) => {
      resubmitted.push({
        batchIds: batches.map((batch) => batch.id),
        transactionId,
      })

      const failure = failures.shift()

      if (failure !== undefined) {
        return {type: 'failed', status: failure}
      }

      if (transactionHistory.has(transactionId)) {
        return {type: 'duplicate'}
      }

      transactionHistory.add(transactionId)
      return {type: 'saved'}
    },
    hasTransaction: (transactionId) => transactionHistory.has(transactionId),
    fetchCopy: () => serverCopy.current,
    subscription: () => feed,
    foldBatches,
    selfConfirming,
    outcomeMethod,
  })

  host.load()
  document.mount()

  if (caret) {
    document.setCaret(caret)
  }

  return {
    editor,
    document,
    host,
    heard,
    clock,
    feed,
    saved,
    serverCopy,
    resubmitted,
    transactionHistory,
    failures,
    mutationsSent,
  }
}
