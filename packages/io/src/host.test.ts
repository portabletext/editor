import {diffMatchPatch, set} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from './document'
import {createIoEditor} from './editor'
import {createNetwork} from './fakes/network'
import {createPassThroughHost} from './host'
import {listenTo} from './scenario/world'
import type {Load, MutationBatch, MutationSent, Transaction} from './types'

describe(createPassThroughHost.name, () => {
  test('a transaction the resync copy covers is dropped, and the next one is forwarded', () => {
    const {editor, host, heard, clock, feed, serverCopy} =
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
    expect(editor.document.toTextspec()).toEqual('H1: foo|')

    host.forward(nextTransaction)

    expect(editor.getBase().rev).toEqual('r3')
    expect(editor.document.toTextspec()).toEqual('H2: foo|')
  })

  test('a transaction delivered late is dropped when a transaction the editor held links it to the resync copy', () => {
    const {editor, host, heard, clock, feed, serverCopy} =
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
    expect(editor.document.toTextspec()).toEqual('H2: foo|')
  })

  test('a transaction that skips ahead after the load reaches the editor', () => {
    const {editor, host, heard} = createHostedEditor('B: foo|')

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
    expect(editor.document.toTextspec()).toEqual('H2: foo|')
  })

  test('a plain host saves each batch under the transaction ID it proposes and sends no `mutation sent`', () => {
    const {editor, host, heard, mutationsSent} = createHostedEditor('B: foo|')

    editor.type('x')
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
    expect(() => host.mapToTransaction('A-1', 'A-1+B-1')).toThrow(
      'A host that saves each batch under its proposed transaction ID never folds batches into one request',
    )
  })

  test('a folding host names the request a batch went out in once, when the server takes it', () => {
    const results = [true, false].map((folded) => {
      const {editor, host, heard, mutationsSent} = createHostedEditor(
        'B: foo|',
        {foldBatches: true},
      )

      editor.type('x')
      const transactionIdsBefore = editor.inspect().inFlight?.transactionIds

      if (folded) {
        host.mapToTransaction('A-1', 'A-1+B-1')
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
      const {editor, host, heard, resubmitted, transactionHistory} =
        createHostedEditor('B: foo|')

      editor.type('x')
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
        answer: 'duplicate',
        resubmitted: [{batchId: 'A-1', transactionId: 'A-t1'}],
        warnings: [],
        transactionIds: ['A-t1'],
      },
      {
        answer: 'saved',
        resubmitted: [{batchId: 'A-1', transactionId: 'A-t1'}],
        warnings: [],
        transactionIds: ['A-t1'],
      },
    ])
  })

  test('a resync naming the batch in flight passes its outcome from the transaction history', () => {
    const results = (
      [
        [true, 'B: foox'],
        [false, 'B: foo'],
      ] as const
    ).map(([landed, copy]) => {
      const {editor, host, heard, serverCopy, transactionHistory} =
        createHostedEditor('B: foo|')
      const outcomes: Array<unknown> = []

      editor.type('x')
      host.reportSaveTaken('A-1')
      editor.type('y')

      if (landed) {
        transactionHistory.add('A-t1')
      }

      serverCopy.current = {
        value: parseTextspec({keyGenerator: createTestKeyGenerator('d-')}, copy)
          .value,
        rev: landed ? 'r2' : 'r1',
      }
      const resync = editor.resync
      editor.resync = (incoming) => {
        outcomes.push(incoming.outcomes)
        resync(incoming)
      }
      host.resync({discardUnsent: false, outcomeOf: 'A-1'})

      return {
        outcomes,
        warnings: heard.warnings,
        screen: editor.document.toTextspec(),
        inFlight: editor.inspect().inFlight?.id,
      }
    })

    expect(results).toEqual([
      {
        outcomes: [{'A-1': 'applied'}],
        warnings: [],
        screen: 'B: fooxy|',
        inFlight: 'A-2',
      },
      {
        outcomes: [{'A-1': 'not applied'}],
        warnings: [],
        screen: 'B: fooxy|',
        inFlight: 'A-2',
      },
    ])
  })

  test('the final batch is saved once the save request of the batch in flight is taken', () => {
    const {editor, host, saved} = createHostedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    editor.type('y')
    editor.close()

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
    const {editor, host, saved} = createHostedEditor('B: foo|')
    const textPath = [{_key: 'd-k0'}, 'children', {_key: 'd-k1'}, 'text']

    editor.type('x')
    host.reportSaveTaken('A-1')
    editor.type('y')
    editor.close()

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
  {foldBatches = false}: {foldBatches?: boolean} = {},
) {
  const {clock} = createNetwork()
  const editor = createIoEditor({
    id: 'A',
    keyGenerator: createTestKeyGenerator('a-'),
    clock,
    claimLoad: true,
  })
  const heard = listenTo(editor)
  const {value, caret} = parseTextspec(
    {keyGenerator: createTestKeyGenerator('d-')},
    textspec,
  )
  const serverCopy: {current: Load} = {current: {value, rev: 'r1'}}
  const feed: Array<Transaction> = []
  const saved: Array<MutationBatch> = []
  const resubmitted: Array<{batchId: string; transactionId: string}> = []
  const transactionHistory = new Set<string>()
  const mutationsSent: Array<MutationSent> = []
  const {mutationSent} = editor
  editor.mutationSent = (incoming) => {
    mutationsSent.push(incoming)
    mutationSent(incoming)
  }
  const host = createPassThroughHost({
    editor,
    save: (batch) => saved.push(batch),
    resubmit: (batch, transactionId) => {
      resubmitted.push({batchId: batch.id, transactionId})

      if (transactionHistory.has(transactionId)) {
        return 'duplicate'
      }

      transactionHistory.add(transactionId)
      return 'saved'
    },
    hasTransaction: (transactionId) => transactionHistory.has(transactionId),
    fetchCopy: () => serverCopy.current,
    subscription: () => feed,
    foldBatches,
  })

  editor.mount()
  host.load()

  if (caret) {
    editor.document.setCaret(caret)
  }

  return {
    editor,
    host,
    heard,
    clock,
    feed,
    saved,
    serverCopy,
    resubmitted,
    transactionHistory,
    mutationsSent,
  }
}
