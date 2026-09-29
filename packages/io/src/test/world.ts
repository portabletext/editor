import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {parseTextspec} from '../document'
import {createIoEditor, type IoEditor} from '../editor'
import {createPassThroughHost, type PassThroughHost} from '../host'
import type {MutationBatch} from '../types'
import {createNetwork, type Network} from './network'
import {createServer, type Server} from './server'

export type EditorName = 'Editor A' | 'Editor B'

export type ServerCopyName = 'no document' | 'no field' | 'an empty list'

export type WorldEditor = {
  editor: IoEditor
  host: PassThroughHost
  /** The batch count at the previous `has sent` check. */
  checkedBatchCount: number
  /** The error count at the previous out-of-step or in-step check. */
  checkedErrorCount: number
}

type Setup = {
  server: Server
  network: Network<MutationBatch>
  editors: Record<EditorName, WorldEditor>
}

type ResyncAttempt = {
  editorName: EditorName
  warningCount: number
  screen: string
  batchCount: number
}

export type World = ReturnType<typeof createWorld>

const heldTransactionTimeout = 10_000

/**
 * One server, one network and two editors, each with a pass-through host.
 * The server's initial document is set up first, and the editors are created
 * on demand, so steps can shape the document before anyone loads it.
 */
export function createWorld() {
  const documentKeyGenerator = createTestKeyGenerator('d-')
  let initialDocument: {value: Array<PortableTextBlock> | undefined} | undefined
  let setup: Setup | undefined
  let lastResync: ResyncAttempt | undefined
  const namedTransactionIds = new Map<string, string>()

  function getSetup(): Setup {
    if (!setup) {
      throw new Error('No editors yet')
    }

    return setup
  }

  function startEditors({claimLoad}: {claimLoad: boolean}): Setup {
    const server = createServer({
      documentId: 'document',
      document: initialDocument,
    })
    const network = createNetwork<MutationBatch>()
    const editors = {
      'Editor A': createWorldEditor({
        name: 'Editor A',
        server,
        network,
        claimLoad,
      }),
      'Editor B': createWorldEditor({
        name: 'Editor B',
        server,
        network,
        claimLoad,
      }),
    }

    setup = {server, network, editors}

    return setup
  }

  function getEditor(name: EditorName): WorldEditor {
    return getSetup().editors[name]
  }

  function getBatch(name: EditorName, batchNumber: number): MutationBatch {
    const batch = getEditor(name).editor.sentBatches[batchNumber - 1]

    if (!batch) {
      throw new Error(`${name} has not sent batch ${batchNumber}`)
    }

    return batch
  }

  function publishReceived(
    batches: Array<{name: EditorName; batch: MutationBatch}>,
    transactionId: string,
  ) {
    const {server, network} = getSetup()
    const [first, second] = batches.map(({batch}) => {
      network.takeSaveRequest(batch.id)
      return batch
    })
    const transaction = second
      ? server.receiveAsOne(first, second, transactionId)
      : server.receive(first, transactionId)

    network.publish(transaction)

    for (const {name, batch} of batches) {
      network.queueReply({
        editorId: name,
        batchId: batch.id,
        outcome: 'accepted',
      })
    }
  }

  function transactionCarrying(batchId: string): string {
    const transaction = getSetup()
      .server.getTransactions()
      .find((candidate) => candidate.batchIds.includes(batchId))

    if (!transaction) {
      throw new Error(`The server has not received batch "${batchId}"`)
    }

    return transaction.transactionId
  }

  function deliverReply(
    name: EditorName,
    batchNumber: number,
    outcome: 'accepted' | 'rejected',
  ) {
    const {network} = getSetup()
    const batch = getBatch(name, batchNumber)
    const reply = network
      .getReplies()
      .find((candidate) => candidate.batchId === batch.id)

    if (reply?.outcome !== outcome) {
      throw new Error(
        `No "${outcome}" reply is waiting for ${name}'s batch ${batchNumber}`,
      )
    }

    network.deliverReply(batch.id)
  }

  function recordNamedTransaction(name: string, transactionId: string) {
    namedTransactionIds.set(name, transactionId)
    return transactionId
  }

  return {
    getEditor,
    getBatch,
    getServer: () => getSetup().server,

    documentIs: (textspec: string) => {
      const {value, caret} = parseTextspec(
        {keyGenerator: documentKeyGenerator},
        textspec,
      )
      initialDocument = {value}

      for (const {editor, host} of Object.values(
        startEditors({claimLoad: true}).editors,
      )) {
        host.load()

        if (caret) {
          editor.document.setCaret(caret)
        }
      }
    },
    serverHas: (textspec: string) => {
      initialDocument = {
        value: parseTextspec({keyGenerator: documentKeyGenerator}, textspec)
          .value,
      }
    },
    serverHasCopy: (copy: ServerCopyName) => {
      initialDocument =
        copy === 'no document'
          ? undefined
          : {value: copy === 'no field' ? undefined : []}
    },
    serverHasEmptyBlock: (key: string) => {
      initialDocument = {
        value: parseTextspec(
          {keyGenerator: documentKeyGenerator},
          `B _key="${key}": |`,
        ).value,
      }
    },
    removeServerBlockKey: () => {
      const [block, ...rest] = initialDocument?.value ?? []

      if (!block || rest.length > 0) {
        throw new Error('Expected the server to have one block')
      }

      const keylessBlock = {...block}
      Reflect.deleteProperty(keylessBlock, '_key')
      initialDocument = {value: [keylessBlock]}
    },
    startEditors,

    receive: (name: EditorName, batchNumber: number) => {
      const batch = getBatch(name, batchNumber)
      publishReceived(
        [{name, batch}],
        getEditor(name).host.getTransactionId(batch.id),
      )
    },
    receiveFinal: (name: EditorName) => {
      const batch = getEditor(name).editor.sentBatches.at(-1)

      if (!batch?.final) {
        throw new Error(`${name} has not sent a final batch`)
      }

      publishReceived(
        [{name, batch}],
        getEditor(name).host.getTransactionId(batch.id),
      )
    },
    receiveAsOne: (
      first: {name: EditorName; batchNumber: number},
      second: {name: EditorName; batchNumber: number},
    ) => {
      const batches = [first, second].map(({name, batchNumber}) => ({
        name,
        batch: getBatch(name, batchNumber),
      }))
      const transactionId = batches.map(({batch}) => batch.id).join('+')

      for (const {name, batch} of batches) {
        getEditor(name).host.mapToTransaction(batch.id, transactionId)
      }

      publishReceived(batches, transactionId)
    },
    refuse: (name: EditorName, batchNumber: number) => {
      const {server, network} = getSetup()
      const batch = getBatch(name, batchNumber)
      network.takeSaveRequest(batch.id)
      server.refuse(batch.id)
      network.queueReply({
        editorId: name,
        batchId: batch.id,
        outcome: 'rejected',
      })
    },
    changeOtherField: () => {
      const {server, network} = getSetup()
      network.publish(
        server.changeOtherField(
          recordNamedTransaction('the other field', 'other-field-1'),
        ),
      )
    },
    deleteDocument: () => {
      const {server, network} = getSetup()
      network.publish(
        server.deleteDocument(
          recordNamedTransaction('the deletion', 'deletion-1'),
        ),
      )
    },
    recreateDocument: (textspec: string) => {
      const {server, network} = getSetup()
      const {value} = parseTextspec(
        {keyGenerator: documentKeyGenerator},
        textspec,
      )
      network.publish(
        server.recreate(
          value,
          recordNamedTransaction('the recreation', 'recreation-1'),
        ),
      )
    },
    deliverBatch: (
      receiverName: EditorName,
      senderName: EditorName,
      batchNumber: number,
    ) => {
      getSetup().network.deliver(
        receiverName,
        transactionCarrying(getBatch(senderName, batchNumber).id),
      )
    },
    deliverNamed: (
      receiverName: EditorName,
      name: 'the other field' | 'the deletion' | 'the recreation',
    ) => {
      const transactionId = namedTransactionIds.get(name)

      if (transactionId === undefined) {
        throw new Error(`No transaction for ${name} yet`)
      }

      getSetup().network.deliver(receiverName, transactionId)
    },
    runOutHeldTransactionWait: () => {
      getSetup().network.clock.advance(heldTransactionTimeout)
    },

    accept: (name: EditorName, batchNumber: number) =>
      deliverReply(name, batchNumber, 'accepted'),
    reject: (name: EditorName, batchNumber: number) =>
      deliverReply(name, batchNumber, 'rejected'),
    resync: (name: EditorName, {discardUnsent}: {discardUnsent: boolean}) => {
      const {editor, host} = getEditor(name)
      lastResync = {
        editorName: name,
        warningCount: editor.warnings.length,
        screen: editor.document.toTextspec({keys: true}),
        batchCount: editor.sentBatches.length,
      }
      host.resync({discardUnsent})
    },
    getLastResync: () => {
      if (!lastResync) {
        throw new Error('No resync yet')
      }

      return lastResync
    },
  }
}

function createWorldEditor({
  name,
  server,
  network,
  claimLoad,
}: {
  name: EditorName
  server: Server
  network: Network<MutationBatch>
  claimLoad: boolean
}): WorldEditor {
  const editor = createIoEditor({
    id: name === 'Editor A' ? 'A' : 'B',
    keyGenerator: createTestKeyGenerator(name === 'Editor A' ? 'a-' : 'b-'),
    clock: network.clock,
    claimLoad,
  })
  const host = createPassThroughHost({
    editor,
    save: (batch) => network.send(name, batch),
    fetchCopy: () => server.copy(),
  })

  network.connect(name, {
    receiveTransaction: host.forward,
    receiveReply: (reply) =>
      reply.outcome === 'accepted'
        ? host.reportAccepted(reply.batchId)
        : host.reportRejected(reply.batchId),
  })

  return {editor, host, checkedBatchCount: 0, checkedErrorCount: 0}
}
