import {diffMatchPatch, set} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {parseTextspec} from './document'
import {createIoEditor} from './editor'
import {createPassThroughHost} from './host'
import {createNetwork} from './test/network'
import {listenTo} from './test/world'
import type {Load, MutationBatch, Transaction} from './types'

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
        patches: [diffMatchPatch('foo', 'foox', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
            style: 'normal',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'fooxy', marks: []}],
            style: 'normal',
          },
        ],
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
        patches: [diffMatchPatch('foo', 'foox', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'foox', marks: []}],
            style: 'normal',
          },
        ],
      },
      {
        id: 'A-2',
        patches: [diffMatchPatch('foox', 'fooxy', textPath)],
        value: [
          {
            _type: 'block',
            _key: 'd-k0',
            children: [{_type: 'span', _key: 'd-k1', text: 'fooxy', marks: []}],
            style: 'normal',
          },
        ],
        final: true,
      },
    ])
  })
})

function createHostedEditor(textspec: string) {
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
  const host = createPassThroughHost({
    editor,
    save: (batch) => saved.push(batch),
    fetchCopy: () => serverCopy.current,
    subscription: () => feed,
  })

  editor.mount()
  host.load()

  if (caret) {
    editor.document.setCaret(caret)
  }

  return {editor, host, heard, clock, feed, saved, serverCopy}
}
