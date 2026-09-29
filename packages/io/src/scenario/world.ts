import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {formatTextspec, parseTextspec} from '../document'
import {
  createIoEditor,
  type IoEditor,
  type IoEditorSentBatch,
  type IoEditorStatus,
} from '../editor'
import {createNetwork, type Network} from '../fakes/network'
import {
  createServer,
  type Server,
  type ServerTransaction,
} from '../fakes/server'
import {createPassThroughHost, type PassThroughHost} from '../host'
import type {ChangeEvent, ErrorEvent, MutationBatch} from '../types'

export type EditorName = 'Editor A' | 'Editor B'

export type ServerCopyName = 'no document' | 'no field' | 'an empty list'

/**
 * What the editor's listeners received, recorded from the moment it was
 * created.
 */
export type Heard = {
  mutations: Array<MutationBatch>
  changes: Array<ChangeEvent>
  errors: Array<ErrorEvent>
  warnings: Array<string>
  /** Changes, errors and warnings in the order they were heard. */
  events: Array<HeardEvent>
}

export type HeardEvent =
  | {type: 'change'; origin: ChangeEvent['origin']; patchCount: number}
  | ({type: 'error'} & Pick<ErrorEvent, 'reason' | 'transactionId'>)
  | {type: 'warning'; message: string}

export type NamedTransaction =
  | 'the other field'
  | "the script's change"
  | 'the deletion'
  | 'the recreation'

/**
 * What a transaction carries: batches sent by the editors, or a change made
 * on the server.
 */
export type TransactionSource =
  | {type: 'batches'; batches: Array<{name: EditorName; batchNumber: number}>}
  | {type: 'named'; name: NamedTransaction}

export type BatchSnapshot = {
  batchNumber: number
  transactionId: string | null
  patchCount: number
  patches: Array<Patch>
}

export type EditorSnapshot = {
  id: string
  status: IoEditorStatus
  /** What the editor shows, with the caret. */
  screen: string
  /** What the editor shows, as blocks, the placeholder included. */
  blocks: Array<PortableTextBlock>
  base: {
    textspec: string | null
    blocks: Array<PortableTextBlock> | null
    rev: string | null
  }
  inFlight: BatchSnapshot | null
  rejected: BatchSnapshot | null
  /** Batches that came back and wait behind a held transaction. */
  echoed: Array<BatchSnapshot>
  pending: Array<{patchCount: number; patches: Array<Patch>}>
  held: Array<{
    transactionId: string
    previousRev: string | null
    resultRev: string | null
    patches: Array<Patch>
  }>
  outOfStep: boolean
  readOnly: boolean
  /** How many of the editor's own changes undo can still revert. */
  undoDepth: number
  sentBatches: Array<{
    number: number
    transactionId: string
    patchCount: number
    patches: Array<Patch>
    final: boolean
  }>
  events: Array<HeardEvent>
}

export type ServerSnapshot = {
  /** The field as textspec, `null` when there is no field. */
  value: string | null
  /** The field as blocks, `null` when there is no field. */
  blocks: Array<PortableTextBlock> | null
  rev: string | null
  transactions: Array<{
    id: string
    previousRev: string | null
    resultRev: string | null
    batchIds: Array<string>
    patchCount: number
    patches: Array<Patch>
    noop: boolean
    source: TransactionSource
  }>
}

export type NetworkSnapshot = {
  saveRequests: Array<{
    editor: EditorName
    batchId: string
    batchNumber: number
    final: boolean
    patchCount: number
    patches: Array<Patch>
  }>
  replies: Array<{
    editor: EditorName
    batchId: string
    batchNumber: number
  }>
  feeds: Record<
    EditorName,
    Array<{
      transactionId: string
      previousRev: string | null
      resultRev: string | null
      batchIds: Array<string>
      patchCount: number
      patches: Array<Patch>
      source: TransactionSource
    }>
  >
  now: number
}

/**
 * The world as plain data. `null` parts before the editors exist.
 */
export type WorldSnapshot = {
  editors: Record<EditorName, EditorSnapshot> | null
  server: ServerSnapshot | null
  network: NetworkSnapshot | null
}

export type WorldEditor = {
  editor: IoEditor
  host: PassThroughHost
  heard: Heard
  /** The batch count at the previous `has sent` check. */
  checkedBatchCount: number
  /** The error count at the previous out-of-step or in-step check. */
  checkedErrorCount: number
  /** The warning count at the previous `has been warned` check. */
  checkedWarningCount: number
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

export const editorNames: ReadonlyArray<EditorName> = ['Editor A', 'Editor B']

/** How long an editor holds a transaction before it reports `out of order`. */
export const heldTransactionTimeout = 10_000

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
  const namedTransactions = new Map<string, NamedTransaction>()
  const namedTransactionCounts = new Map<NamedTransaction, number>()

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

  function publishReceived(
    batches: Array<{name: EditorName; batch: MutationBatch}>,
    transactionId: string,
  ) {
    const {server, network} = getSetup()
    const [first, second] = batches.map(
      ({batch}) => network.takeSaveRequest(batch.id).batch,
    )
    const transaction = second
      ? server.receiveAsOne(first, second, transactionId)
      : server.receive(first, transactionId)

    network.publish(transaction)
  }

  function getBatch(name: EditorName, batchNumber: number): MutationBatch {
    const batch = getEditor(name).heard.mutations[batchNumber - 1]

    if (!batch) {
      throw new Error(`${name} has not sent batch ${batchNumber}`)
    }

    return batch
  }

  function getEditor(name: EditorName): WorldEditor {
    return getSetup().editors[name]
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

  function nameTransaction(name: NamedTransaction) {
    const count = (namedTransactionCounts.get(name) ?? 0) + 1
    const transactionId = `${namedTransactionPrefixes[name]}-${count}`
    namedTransactionCounts.set(name, count)
    namedTransactions.set(transactionId, name)
    return transactionId
  }

  function describeSource(transaction: ServerTransaction): TransactionSource {
    if (transaction.batchIds.length === 0) {
      const name = namedTransactions.get(transaction.transactionId)

      if (!name) {
        throw new Error(
          `Transaction "${transaction.transactionId}" carries no batch`,
        )
      }

      return {type: 'named', name}
    }

    return {
      type: 'batches',
      batches: transaction.batchIds.map((batchId) => locateBatch(batchId)),
    }
  }

  function locateBatch(batchId: string): {
    name: EditorName
    batchNumber: number
  } {
    for (const name of editorNames) {
      const index = getEditor(name).heard.mutations.findIndex(
        (batch) => batch.id === batchId,
      )

      if (index !== -1) {
        return {name, batchNumber: index + 1}
      }
    }

    throw new Error(`No editor has sent batch "${batchId}"`)
  }

  function snapshotEditor(name: EditorName): EditorSnapshot {
    const {editor, host, heard} = getEditor(name)
    const {server} = getSetup()
    const ledger = editor.inspect()
    const base = editor.getBase()
    const describeBatch = (batch: IoEditorSentBatch): BatchSnapshot => ({
      batchNumber: locateBatch(batch.id).batchNumber,
      transactionId: batch.transactionId ?? null,
      patchCount: batch.patchCount,
      patches: getBatch(name, locateBatch(batch.id).batchNumber).patches,
    })

    return {
      id: name === 'Editor A' ? 'A' : 'B',
      status: editor.getStatus(),
      screen: editor.document.toTextspec(),
      blocks: editor.document.getValue(),
      base: {
        textspec: base.value === undefined ? null : formatTextspec(base.value),
        blocks: base.value ?? null,
        rev: base.rev ?? null,
      },
      inFlight: ledger.inFlight ? describeBatch(ledger.inFlight) : null,
      rejected: ledger.rejected ? describeBatch(ledger.rejected) : null,
      echoed: ledger.echoed.map(describeBatch),
      pending: ledger.pending,
      held: ledger.held.map((transaction) => ({
        transactionId: transaction.transactionId,
        previousRev: transaction.previousRev ?? null,
        resultRev: transaction.resultRev ?? null,
        patches: server.getTransaction(transaction.transactionId).patches,
      })),
      outOfStep: ledger.outOfStep,
      readOnly: ledger.readOnly,
      undoDepth: ledger.undoDepth,
      sentBatches: heard.mutations.map((batch, index) => ({
        number: index + 1,
        transactionId: host.getTransactionId(batch.id),
        patchCount: batch.patches.length,
        patches: batch.patches,
        final: batch.final === true,
      })),
      events: [...heard.events],
    }
  }

  function snapshot(): WorldSnapshot {
    if (!setup) {
      return {editors: null, server: null, network: null}
    }

    const {server, network} = setup
    const copy = server.copy()
    const describeFeedItem = (transaction: ServerTransaction) => ({
      transactionId: transaction.transactionId,
      previousRev: transaction.previousRev ?? null,
      resultRev: transaction.resultRev ?? null,
      batchIds: [...transaction.batchIds],
      patchCount: transaction.patches.length,
      patches: transaction.patches,
      source: describeSource(transaction),
    })

    return {
      editors: {
        'Editor A': snapshotEditor('Editor A'),
        'Editor B': snapshotEditor('Editor B'),
      },
      server: {
        value: copy.value === undefined ? null : formatTextspec(copy.value),
        blocks: copy.value ?? null,
        rev: copy.rev ?? null,
        transactions: server.getLog().map(({transaction, changesField}) => ({
          id: transaction.transactionId,
          previousRev: transaction.previousRev ?? null,
          resultRev: transaction.resultRev ?? null,
          batchIds: [...transaction.batchIds],
          patchCount: transaction.patches.length,
          patches: transaction.patches,
          noop: !changesField,
          source: describeSource(transaction),
        })),
      },
      network: {
        saveRequests: network.getSaveRequests().map(({editorId, batch}) => ({
          editor: toEditorName(editorId),
          batchId: batch.id,
          batchNumber: locateBatch(batch.id).batchNumber,
          final: batch.final === true,
          patchCount: batch.patches.length,
          patches: batch.patches,
        })),
        replies: network.getReplies().map((reply) => ({
          editor: toEditorName(reply.editorId),
          batchId: reply.batchId,
          batchNumber: locateBatch(reply.batchId).batchNumber,
        })),
        feeds: {
          'Editor A': network.getFeed('Editor A').map(describeFeedItem),
          'Editor B': network.getFeed('Editor B').map(describeFeedItem),
        },
        now: network.clock.now(),
      },
    }
  }

  function getSetup(): Setup {
    if (!setup) {
      throw new Error('No editors yet')
    }

    return setup
  }

  return {
    getEditor,
    getBatch,
    getServer: () => getSetup().server,
    snapshot,

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
      const batch = getEditor(name).heard.mutations.at(-1)

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
      network.queueReply({editorId: name, batchId: batch.id})
    },
    changeOtherField: () => {
      const {server, network} = getSetup()
      network.publish(
        server.changeOtherField(nameTransaction('the other field')),
      )
    },
    setFieldByScript: (textspec: string) => {
      const {server, network} = getSetup()
      const {value} = parseTextspec(
        {keyGenerator: documentKeyGenerator},
        textspec,
      )
      network.publish(
        server.setField(value, nameTransaction("the script's change")),
      )
    },
    deleteDocument: () => {
      const {server, network} = getSetup()
      network.publish(server.deleteDocument(nameTransaction('the deletion')))
    },
    recreateDocument: (textspec: string) => {
      const {server, network} = getSetup()
      const {value} = parseTextspec(
        {keyGenerator: documentKeyGenerator},
        textspec,
      )
      network.publish(server.recreate(value, nameTransaction('the recreation')))
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
    deliverNamed: (receiverName: EditorName, name: NamedTransaction) => {
      const {network} = getSetup()
      const transaction = network
        .getFeed(receiverName)
        .find(
          (candidate) =>
            namedTransactions.get(candidate.transactionId) === name,
        )

      if (!transaction) {
        throw new Error(
          `No transaction for ${name} is waiting for ${receiverName}`,
        )
      }

      network.deliver(receiverName, transaction.transactionId)
    },
    advanceClock: (milliseconds: number) => {
      getSetup().network.clock.advance(milliseconds)
    },

    reject: (name: EditorName, batchNumber: number) => {
      const {network} = getSetup()
      const batch = getBatch(name, batchNumber)

      if (!network.getReplies().some((reply) => reply.batchId === batch.id)) {
        throw new Error(
          `No rejection is waiting for ${name}'s batch ${batchNumber}`,
        )
      }

      network.deliverReply(batch.id)
    },
    resync: (name: EditorName, {discardUnsent}: {discardUnsent: boolean}) => {
      const {editor, host, heard} = getEditor(name)
      lastResync = {
        editorName: name,
        warningCount: heard.warnings.length,
        screen: editor.document.toTextspec({keys: true}),
        batchCount: heard.mutations.length,
      }
      host.resync({discardUnsent})
    },
    load: (name: EditorName) => {
      getEditor(name).host.load()
    },
    releaseClaim: (name: EditorName) => {
      getEditor(name).editor.releaseClaim()
    },

    type: (name: EditorName, text: string) => {
      getEditor(name).editor.type(text)
    },
    deleteBeforeCaret: (name: EditorName, text: string) => {
      getEditor(name).editor.deleteBeforeCaret(text)
    },
    putCaretAfter: (name: EditorName, text: string) => {
      getEditor(name).editor.putCaretAfter(text)
    },
    setStyle: (name: EditorName, style: string) => {
      getEditor(name).editor.setStyle(style)
    },
    insertBlock: (name: EditorName, textspec: string) => {
      getEditor(name).editor.insertBlock(textspec)
    },
    deleteBlock: (name: EditorName, text: string) => {
      getEditor(name).editor.deleteBlock(text)
    },
    undo: (name: EditorName) => {
      getEditor(name).editor.undo()
    },
    becomeReadOnly: (name: EditorName) => {
      getEditor(name).editor.updateReadOnly(true)
    },
    close: (name: EditorName) => {
      getEditor(name).editor.close()
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
  const heard = listenTo(editor)
  const host = createPassThroughHost({
    editor,
    save: (batch) => network.send(name, batch),
    fetchCopy: () => server.copy(),
    subscription: () => network.getFeed(name),
  })

  network.connect(name, {
    receiveTransaction: host.forward,
    receiveReply: (reply) => host.reportRejected(reply.batchId),
    receiveSaveTaken: host.reportSaveTaken,
  })
  editor.mount()

  return {
    editor,
    host,
    heard,
    checkedBatchCount: 0,
    checkedErrorCount: 0,
    checkedWarningCount: 0,
  }
}

export function listenTo(editor: IoEditor): Heard {
  const heard: Heard = {
    mutations: [],
    changes: [],
    errors: [],
    warnings: [],
    events: [],
  }

  editor.on((event) => {
    switch (event.type) {
      case 'mutation': {
        const {type: _type, ...batch} = event
        heard.mutations.push(batch)
        break
      }
      case 'change': {
        const {type: _type, ...change} = event
        heard.changes.push(change)
        heard.events.push({
          type: 'change',
          origin: change.origin,
          patchCount: change.operations.length,
        })
        break
      }
      case 'error': {
        const {type: _type, ...error} = event
        heard.errors.push(error)
        heard.events.push({
          type: 'error',
          reason: error.reason,
          ...(error.transactionId === undefined
            ? {}
            : {transactionId: error.transactionId}),
        })
        break
      }
      case 'warning':
        heard.warnings.push(event.message)
        heard.events.push({type: 'warning', message: event.message})
        break
      case 'ready':
        break
    }
  })

  return heard
}

const namedTransactionPrefixes: Record<NamedTransaction, string> = {
  'the other field': 'other-field',
  "the script's change": 'script',
  'the deletion': 'deletion',
  'the recreation': 'recreation',
}

function toEditorName(editorId: string): EditorName {
  if (editorId === 'Editor A' || editorId === 'Editor B') {
    return editorId
  }

  throw new Error(`No editor "${editorId}"`)
}
