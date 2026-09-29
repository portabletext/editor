import {set} from '@portabletext/patches'
import {describe, expect, test} from 'vitest'
import {createNetwork, type Reply} from './network'
import type {ServerTransaction} from './server'

describe(createNetwork.name, () => {
  test('save requests leave in the order the caller takes them', () => {
    const network = createNetwork()
    const batchA1 = {id: 'a1', patches: [set('h1', [{_key: 'k0'}, 'style'])]}
    const batchA2 = {id: 'a2', patches: [set('h2', [{_key: 'k0'}, 'style'])]}
    const batchB1 = {
      id: 'b1',
      patches: [set('normal', [{_key: 'k0'}, 'style'])],
    }

    network.send('A', batchA1)
    network.send('A', batchA2)
    network.send('B', batchB1)

    expect(network.takeSaveRequest('b1')).toEqual({
      editorId: 'B',
      batch: batchB1,
    })
    expect(network.takeSaveRequest('a2')).toEqual({
      editorId: 'A',
      batch: batchA2,
    })
    expect(network.getSaveRequests()).toEqual([{editorId: 'A', batch: batchA1}])
    expect(network.takeSaveRequest('a1')).toEqual({
      editorId: 'A',
      batch: batchA1,
    })
    expect(network.getSaveRequests()).toEqual([])
    expect(() => network.takeSaveRequest('a1')).toThrow(
      'No save request for batch "a1"',
    )
  })

  test('taking a save request tells the editor that sent it', () => {
    const network = createNetwork()
    const taken: Array<{editorId: string; batchId: string}> = []

    for (const editorId of ['A', 'B']) {
      network.connect(editorId, {
        receiveTransaction: () => {},
        receiveReply: () => {},
        receiveSaveTaken: (batchId) => {
          taken.push({editorId, batchId})
        },
      })
    }

    network.send('A', {id: 'a1', patches: []})
    network.send('B', {id: 'b1', patches: []})
    network.takeSaveRequest('b1')

    expect(taken).toEqual([{editorId: 'B', batchId: 'b1'}])
  })

  test('replies reach the sending editor in the order the caller delivers them', () => {
    const network = createNetwork()
    const received: Array<{editorId: string; reply: Reply}> = []

    for (const editorId of ['A', 'B']) {
      network.connect(editorId, {
        receiveTransaction: () => {},
        receiveReply: (reply) => {
          received.push({editorId, reply})
        },
        receiveSaveTaken: () => {},
      })
    }

    network.queueReply({editorId: 'A', batchId: 'a1'})
    network.queueReply({editorId: 'B', batchId: 'b1'})
    network.deliverReply('b1')

    expect(network.getReplies()).toEqual([{editorId: 'A', batchId: 'a1'}])

    network.deliverReply('a1')

    expect(received).toEqual([
      {
        editorId: 'B',
        reply: {editorId: 'B', batchId: 'b1'},
      },
      {
        editorId: 'A',
        reply: {editorId: 'A', batchId: 'a1'},
      },
    ])
    expect(network.getReplies()).toEqual([])
  })

  test('each editor receives its feed in the order the caller delivers it', () => {
    const network = createNetwork()
    const received: Array<{editorId: string; transactionId: string}> = []
    const firstTransaction: ServerTransaction = {
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [set('h1', [{_key: 'k0'}, 'style'])],
      batchIds: ['b1'],
    }
    const secondTransaction: ServerTransaction = {
      transactionId: 't2',
      previousRev: 'r2',
      resultRev: 'r3',
      patches: [],
      batchIds: [],
    }

    for (const editorId of ['A', 'B']) {
      network.connect(editorId, {
        receiveTransaction: (transaction) => {
          received.push({editorId, transactionId: transaction.transactionId})
        },
        receiveReply: () => {},
        receiveSaveTaken: () => {},
      })
    }

    network.publish(firstTransaction)
    network.publish(secondTransaction)

    expect(network.getFeed('A')).toEqual([firstTransaction, secondTransaction])

    network.deliver('A', 't2')
    network.deliver('A', 't1')
    network.deliver('B', 't1')

    expect(received).toEqual([
      {editorId: 'A', transactionId: 't2'},
      {editorId: 'A', transactionId: 't1'},
      {editorId: 'B', transactionId: 't1'},
    ])
    expect(network.getFeed('A')).toEqual([])
    expect(network.getFeed('B')).toEqual([secondTransaction])
    expect(() => network.deliver('A', 't1')).toThrow(
      'No transaction "t1" waiting for editor "A"',
    )
  })

  test('an editor that connects late gets only later transactions', () => {
    const network = createNetwork()
    const receiver = {
      receiveTransaction: () => {},
      receiveReply: () => {},
      receiveSaveTaken: () => {},
    }
    const transaction: ServerTransaction = {
      transactionId: 't1',
      previousRev: 'r1',
      resultRev: 'r2',
      patches: [],
      batchIds: [],
    }

    network.connect('A', receiver)
    network.publish(transaction)
    network.connect('B', receiver)

    expect(network.getFeed('A')).toEqual([transaction])
    expect(network.getFeed('B')).toEqual([])
  })

  test('the clock runs what falls due, in due order, only when advanced', () => {
    const network = createNetwork()
    const fired: Array<{name: string; at: number}> = []

    network.clock.schedule(10_000, () => {
      fired.push({name: 'hold', at: network.clock.now()})
    })
    network.clock.schedule(5_000, () => {
      fired.push({name: 'warning', at: network.clock.now()})
    })
    const cancel = network.clock.schedule(5_000, () => {
      fired.push({name: 'cancelled', at: network.clock.now()})
    })
    network.clock.schedule(5_000, () => {
      fired.push({name: 'second warning', at: network.clock.now()})
    })
    cancel()

    network.clock.advance(4_999)

    expect(fired).toEqual([])
    expect(network.clock.now()).toEqual(4_999)

    network.clock.advance(6_000)

    expect(fired).toEqual([
      {name: 'warning', at: 5_000},
      {name: 'second warning', at: 5_000},
      {name: 'hold', at: 10_000},
    ])
    expect(network.clock.now()).toEqual(10_999)
  })

  test('a callback can schedule another that falls due in the same advance', () => {
    const network = createNetwork()
    const fired: Array<number> = []

    network.clock.schedule(1_000, () => {
      fired.push(network.clock.now())
      network.clock.schedule(2_000, () => {
        fired.push(network.clock.now())
      })
    })
    network.clock.advance(10_000)

    expect(fired).toEqual([1_000, 3_000])
  })
})
