import {set, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  createFakeDocument,
  formatTextspec,
  isEqual,
  parseTextspec,
  type FakeDocument,
  type FakeDocumentStatus,
} from '../fakes/document'
import {createFakeNetwork, type Network} from '../fakes/network'
import {
  createFakeServer,
  type Server,
  type ServerTransaction,
} from '../fakes/server'
import {applyWithContentLakeSemantics} from '../protocol/content-lake'
import {
  createPassThroughHost,
  type PassThroughHost,
  type RequestFailure,
  type SaveAnswer,
} from '../protocol/host'
import {
  createIo,
  type Clock,
  type Io,
  type IoSentBatch,
  type IoSync,
} from '../protocol/io'
import type {
  ChangeEvent,
  EditorMessageForIo,
  ErrorEvent,
  Load,
  MutationBatch,
  MutationRejected,
  MutationSent,
  Resync,
  Transaction,
  WorkDropped,
} from '../protocol/types'

export type EditorName = 'Editor A' | 'Editor B'

export type ServerCopyName = 'no document' | 'no field' | 'an empty list'

/**
 * How the hosts save: `'plain'` saves each batch as its own request under
 * the transaction ID it proposes, `'folding'` folds batches into shared
 * requests and names each request's transaction with `mutation sent`, and
 * `'self-confirming'` has no feed listener and forwards the transaction each
 * save answers with.
 */
export type HostShape = 'plain' | 'folding' | 'self-confirming'

/**
 * What the editor's listeners received, recorded from the moment it was
 * created.
 */
export type Heard = {
  mutations: Array<MutationBatch>
  changes: Array<ChangeEvent>
  errors: Array<ErrorEvent>
  warnings: Array<string>
  workDropped: Array<WorkDropped>
  /** Changes, errors, dropped work and warnings in the order they were heard. */
  events: Array<HeardEvent>
}

export type HeardEvent =
  | {type: 'change'; origin: ChangeEvent['origin']; patchCount: number}
  | ({type: 'error'} & ErrorEvent)
  | ({type: 'work dropped'; patchCount: number} & WorkDropped)
  | {type: 'warning'; message: string}

/**
 * A message on an editor's path, recorded in the order it passed: io and its
 * host talking, io sending the editor content, and the host sending a save
 * request again to find out what became of it. A `transaction` says whether
 * the host had it from the feed or from the answer to its own save.
 */
export type PathMessage =
  | ({route: 'io to host'; type: 'mutation'} & MutationBatch)
  | ({route: 'host to io'; type: 'mutation sent'} & MutationSent)
  | ({route: 'host to io'; type: 'mutation rejected'} & MutationRejected)
  | ({
      route: 'host to io'
      type: 'transaction'
      via: 'feed' | 'save reply'
    } & Transaction)
  | {route: 'host to io'; type: 'feed lost'}
  | ({route: 'host to io'; type: 'load'} & Load)
  | ({route: 'host to io'; type: 'resync'} & Resync)
  | ({route: 'io to editor'} & EditorMessageForIo)
  | {
      route: 'host to server'
      type: 're-submit'
      transactionId: string
      answer: SaveAnswer
    }

/**
 * A moment an editor's tree differed from io's working copy: right after
 * the editor took a message from io or a local change, or at the end of a
 * step. Both are textspec with keys, the placeholder left out.
 */
export type TreeMismatch = {
  editor: EditorName
  after: EditorMessageForIo['type'] | 'local change' | 'the step'
  tree: string
  workingCopy: string
}

export type NamedTransaction =
  | 'the other field'
  | "the script's change"
  | "the script's corruption"
  | 'the deletion'
  | 'the recreation'

/**
 * A change that leaves a block below the floor: without its `_key` or
 * `_type`, with `children` that is a string, with its first span's `text` a
 * number, or replaced by a string.
 */
export type Corruption =
  | {type: 'no key'}
  | {type: 'no type'}
  | {type: 'children'; children: string}
  | {type: 'span text'; text: number}
  | {type: 'string'; value: string}

/**
 * What a transaction carries: batches sent by the editors, or a change made
 * on the server.
 */
export type TransactionSource =
  | {type: 'batches'; batches: Array<{name: EditorName; batchNumber: number}>}
  | {type: 'named'; name: NamedTransaction}

export type BatchSnapshot = {
  batchNumber: number
  /** Every transaction ID the host reported for the batch. */
  transactionIds: Array<string>
  patchCount: number
  patches: Array<Patch>
}

export type EditorSnapshot = {
  id: string
  host: HostShape
  status: FakeDocumentStatus
  sync: IoSync
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
  messages: Array<PathMessage>
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
  /** Save requests refused with a 409 because their transaction ID exists. */
  duplicates: Array<{
    transactionId: string
    batches: Array<{name: EditorName; batchNumber: number}>
  }>
  /** The failure the next save request meets, if a step injected one. */
  nextFailure: RequestFailure | null
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
  /** Replies that say a save request failed, with the failure. */
  replies: Array<{
    editor: EditorName
    batchId: string
    batchNumber: number
    status: RequestFailure
  }>
  /** Saves the server took whose reply never reached the host. */
  lostReplies: Array<{
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
  /** Whether each transaction reaches the hosts with the server's copy. */
  carriesServerCopy: boolean
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
  /** The fake editor, which the user steps act on. */
  document: FakeDocument
  io: Io
  host: PassThroughHost
  heard: Heard
  /** Every `mutation sent` the host gave the editor. */
  mutationsSent: Array<MutationSent>
  /** Every message io sent the editor. */
  received: Array<EditorMessageForIo>
  /** Every message on the editor's path, in order. */
  messages: Array<PathMessage>
  /**
   * The moments the editor's tree differed from io's working copy, since the
   * last `takeTreeMismatches`.
   */
  treeMismatches: Array<Omit<TreeMismatch, 'editor'>>
  /** The batch count at the previous `has sent` check. */
  checkedBatchCount: number
  /** The error count at the previous out-of-step or in-step check. */
  checkedErrorCount: number
  /** The warning count at the previous `has been warned` check. */
  checkedWarningCount: number
  /** The dropped-work count at the previous `told work was dropped` check. */
  checkedWorkDroppedCount: number
}

type Setup = {
  server: Server
  network: Network<MutationBatch>
  editors: Record<EditorName, WorldEditor>
}

type LoadAttempt = {
  editorName: EditorName
  threw: boolean
  screen: string
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
 * on demand, so steps can shape the document before anyone loads it. A
 * created editor is in its first commit until a step ends it. With
 * `serverCopyOnTransactions`, every transaction reaches the hosts with the
 * field as the server held it right after, and the hosts pass it on as
 * `value`.
 */
export function createWorld(
  options: {serverCopyOnTransactions?: boolean} = {},
) {
  const documentKeyGenerator = createTestKeyGenerator('d-')
  let initialDocument: {value: Array<PortableTextBlock> | undefined} | undefined
  let hostShape: HostShape = 'plain'
  let serverCopyOnTransactions = options.serverCopyOnTransactions ?? false
  let setup: Setup | undefined
  let lastResync: ResyncAttempt | undefined
  let lastLoad: LoadAttempt | undefined
  const namedTransactions = new Map<string, NamedTransaction>()
  const namedTransactionCounts = new Map<NamedTransaction, number>()

  function startEditors(): Setup {
    const server = createFakeServer({
      documentId: 'document',
      document: initialDocument,
    })
    const network = createFakeNetwork<MutationBatch>(
      serverCopyOnTransactions
        ? {copyAfter: (transactionId) => server.getCopyAfter(transactionId)}
        : {},
    )
    const editors = {
      'Editor A': createWorldEditor({
        name: 'Editor A',
        server,
        network,
        hostShape,
      }),
      'Editor B': createWorldEditor({
        name: 'Editor B',
        server,
        network,
        hostShape,
      }),
    }

    setup = {server, network, editors}

    return setup
  }

  /**
   * The server takes the save requests first, so a host that forms the
   * request at that moment has formed it before the save. The server gets
   * the request as the first batch's host formed it, and answers a 409 when
   * a re-submit saved it already. A failed request sends each sender a reply
   * with the failure.
   */
  function publishReceived(
    batches: Array<{name: EditorName; batch: MutationBatch}>,
  ) {
    const {server, network} = getSetup()

    for (const {batch} of batches) {
      network.takeSaveRequest(batch.id)
    }

    const [first] = batches
    const request = getEditor(first.name).host.getRequest(first.batch.id)
    const result = server.submit(request.batches, request.transactionId)

    if (result.type === 'saved') {
      publishSaved(batches, result.transaction)
    }

    if (result.type === 'failed') {
      for (const {name, batch} of batches) {
        network.queueReply({
          editorId: name,
          batchId: batch.id,
          status: result.status,
        })
      }
    }
  }

  function foldAsOne(
    first: {name: EditorName; batchNumber: number},
    second: {name: EditorName; batchNumber: number},
  ): Array<{name: EditorName; batch: MutationBatch}> {
    const batches = [first, second].map(({name, batchNumber}) => ({
      name,
      batch: getBatch(name, batchNumber),
    }))
    const request = {
      transactionId: batches.map(({batch}) => batch.id).join('+'),
      batches: batches.map(({batch}) => batch),
    }

    for (const {name, batch} of batches) {
      getEditor(name).host.foldIntoRequest(batch.id, request)
    }

    return batches
  }

  /** The feed carries the transaction, and so does each sender's save reply. */
  function publishSaved(
    batches: Array<{name: EditorName; batch: MutationBatch}>,
    transaction: ServerTransaction,
  ) {
    getSetup().network.publish(transaction)

    for (const {name, batch} of batches) {
      getEditor(name).host.reportSaved(
        batch.id,
        getSetup().network.carry(transaction),
      )
    }
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
    const {document, io, host, heard, messages} = getEditor(name)
    const {server} = getSetup()
    const ledger = io.inspect()
    const base = io.getBase()
    const describeBatch = (batch: IoSentBatch): BatchSnapshot => ({
      batchNumber: locateBatch(batch.id).batchNumber,
      transactionIds: batch.transactionIds,
      patchCount: batch.patchCount,
      patches: getBatch(name, locateBatch(batch.id).batchNumber).patches,
    })

    return {
      id: name === 'Editor A' ? 'A' : 'B',
      host: hostShape,
      status: document.getStatus(),
      sync: io.getSync(),
      screen: document.toTextspec(),
      blocks: document.getValue(),
      base: {
        textspec:
          base.value === undefined ? null : formatStoredTextspec(base.value),
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
      readOnly: document.getReadOnly(),
      undoDepth: ledger.undoDepth,
      sentBatches: heard.mutations.map((batch, index) => ({
        number: index + 1,
        transactionId: host.getTransactionId(batch.id),
        patchCount: batch.patches.length,
        patches: batch.patches,
        final: batch.final === true,
      })),
      events: [...heard.events],
      messages: [...messages],
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
        value:
          copy.value === undefined ? null : formatStoredTextspec(copy.value),
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
        duplicates: server.getDuplicates().map((duplicate) => ({
          transactionId: duplicate.transactionId,
          batches: duplicate.batchIds.map((batchId) => locateBatch(batchId)),
        })),
        nextFailure: server.getNextFailure() ?? null,
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
          status: reply.status,
        })),
        lostReplies: network.getLostReplies().map((reply) => ({
          editor: toEditorName(reply.editorId),
          batchId: reply.batchId,
          batchNumber: locateBatch(reply.batchId).batchNumber,
        })),
        feeds: {
          'Editor A': network.getFeed('Editor A').map(describeFeedItem),
          'Editor B': network.getFeed('Editor B').map(describeFeedItem),
        },
        carriesServerCopy: serverCopyOnTransactions,
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

  /**
   * The tree mismatches recorded since the last call, and any an open editor
   * has now. An editor that has closed is left out: its final batch is no
   * longer in the working copy.
   */
  function takeTreeMismatches(): Array<TreeMismatch> {
    if (!setup) {
      return []
    }

    return editorNames.flatMap((name) => {
      const worldEditor = getEditor(name)
      const recorded = worldEditor.treeMismatches.splice(0)
      const now = findTreeMismatch(worldEditor, 'the step')

      return [...recorded, ...(now ? [now] : [])].map((mismatch) => ({
        editor: name,
        ...mismatch,
      }))
    })
  }

  return {
    getEditor,
    getBatch,
    getServer: () => getSetup().server,
    snapshot,
    takeTreeMismatches,

    documentIs: (textspec: string) => {
      const {value, caret} = parseTextspec(
        {keyGenerator: documentKeyGenerator},
        textspec,
      )
      initialDocument = {value}

      for (const {document, host} of Object.values(startEditors().editors)) {
        host.load()

        if (caret) {
          document.setCaret(caret)
        }

        document.mount()
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
    /** Changes the server's document before anyone loads it. */
    corruptServerBlock: (key: string, corruption: Corruption) => {
      if (setup) {
        throw new Error('The editors are set up already')
      }

      const value = initialDocument?.value
      initialDocument = {
        value: applyWithContentLakeSemantics(
          value,
          corruptionPatches(value, key, corruption),
        ),
      }
    },
    startEditors,

    setHostShape: (shape: HostShape) => {
      if (setup) {
        throw new Error('The hosts are set up already')
      }

      hostShape = shape
    },
    carryServerCopyOnTransactions: () => {
      if (setup) {
        throw new Error('The network is set up already')
      }

      serverCopyOnTransactions = true
    },

    receive: (name: EditorName, batchNumber: number) => {
      publishReceived([{name, batch: getBatch(name, batchNumber)}])
    },
    receiveFinal: (name: EditorName) => {
      const batch = getEditor(name).heard.mutations.at(-1)

      if (!batch?.final) {
        throw new Error(`${name} has not sent a final batch`)
      }

      publishReceived([{name, batch}])
    },
    /** The hosts fold both batches into one request, which stays unsent. */
    foldAsOne,
    receiveAsOne: (
      first: {name: EditorName; batchNumber: number},
      second: {name: EditorName; batchNumber: number},
    ) => {
      publishReceived(foldAsOne(first, second))
    },
    rewriteAsWholeFieldUnset: (name: EditorName, batchNumber: number) => {
      const {server, network} = getSetup()
      const batch = getBatch(name, batchNumber)
      network.takeSaveRequest(batch.id)
      publishSaved(
        [{name, batch}],
        server.receive(
          {id: batch.id, patches: [unset([])]},
          getEditor(name).host.getTransactionId(batch.id),
        ),
      )
    },
    loseReply: (name: EditorName, batchNumber: number) => {
      const batch = getBatch(name, batchNumber)

      if (batch.final) {
        throw new Error(`${name}'s batch ${batchNumber} is final: no reply`)
      }

      transactionCarrying(batch.id)
      getSetup().network.loseReply({editorId: name, batchId: batch.id})
    },
    retry: (name: EditorName, batchNumber: number) => {
      const batch = getBatch(name, batchNumber)
      getSetup().network.takeLostReply(batch.id)
      getEditor(name).host.retry(batch.id)
    },
    failNextRequest: (status: RequestFailure) => {
      getSetup().server.failNextRequest(status)
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
    corruptByScript: (key: string, corruption: Corruption) => {
      const {server, network} = getSetup()
      network.publish(
        server.patchField(
          corruptionPatches(server.copy().value, key, corruption),
          nameTransaction("the script's corruption"),
        ),
      )
    },
    alterServerCopy: (key: string, corruption: Corruption) => {
      const {server} = getSetup()
      server.alterLatestCopy(
        corruptionPatches(server.copy().value, key, corruption),
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

    deliverReply: (name: EditorName, batchNumber: number) => {
      const {network} = getSetup()
      const batch = getBatch(name, batchNumber)

      if (!network.getReplies().some((reply) => reply.batchId === batch.id)) {
        throw new Error(
          `No reply is waiting for ${name}'s batch ${batchNumber}`,
        )
      }

      network.deliverReply(batch.id)
    },
    resync: (
      name: EditorName,
      {discardUnsent, outcomeOf}: {discardUnsent: boolean; outcomeOf?: number},
    ) => {
      const {document, host, heard} = getEditor(name)
      lastResync = {
        editorName: name,
        warningCount: heard.warnings.length,
        screen: document.toTextspec({keys: true}),
        batchCount: heard.mutations.length,
      }
      host.resync({
        discardUnsent,
        ...(outcomeOf === undefined
          ? {}
          : {outcomeOf: getBatch(name, outcomeOf).id}),
      })
    },
    feedLost: (name: EditorName) => {
      getEditor(name).host.feedLost()
    },
    load: (name: EditorName) => {
      getEditor(name).host.load()
    },
    /** Loads the editor and records whether the load threw, without throwing. */
    loadAgain: (name: EditorName) => {
      const {document, host} = getEditor(name)
      const screen = document.toTextspec({keys: true})
      let threw = false

      try {
        host.load()
      } catch {
        threw = true
      }

      lastLoad = {editorName: name, threw, screen}
    },
    endFirstCommit: (name: EditorName) => {
      getEditor(name).document.mount()
    },

    type: (name: EditorName, text: string) => {
      getEditor(name).document.type(text)
    },
    deleteBeforeCaret: (name: EditorName, text: string) => {
      getEditor(name).document.deleteBeforeCaret(text)
    },
    putCaretAfter: (name: EditorName, text: string) => {
      getEditor(name).document.putCaretAfter(text)
    },
    setStyle: (name: EditorName, style: string) => {
      getEditor(name).document.setStyle(style)
    },
    insertBlock: (name: EditorName, textspec: string) => {
      getEditor(name).document.insertBlock(textspec)
    },
    deleteBlock: (name: EditorName, text: string) => {
      getEditor(name).document.deleteBlock(text)
    },
    undo: (name: EditorName) => {
      getEditor(name).io.undo()
    },
    becomeReadOnly: (name: EditorName) => {
      getEditor(name).document.updateReadOnly(true)
    },
    close: (name: EditorName) => {
      getEditor(name).document.close()
    },

    getLastResync: () => {
      if (!lastResync) {
        throw new Error('No resync yet')
      }

      return lastResync
    },
    getLastLoad: () => {
      if (!lastLoad) {
        throw new Error('No load yet')
      }

      return lastLoad
    },
  }
}

function createWorldEditor({
  name,
  server,
  network,
  hostShape,
}: {
  name: EditorName
  server: Server
  network: Network<MutationBatch>
  hostShape: HostShape
}): WorldEditor {
  const {document, io, heard, received, messages, treeMismatches} =
    createEditorWithIo({
      id: name === 'Editor A' ? 'A' : 'B',
      keyGenerator: createTestKeyGenerator(name === 'Editor A' ? 'a-' : 'b-'),
      clock: network.clock,
    })
  const mutationsSent: Array<MutationSent> = []
  let arrivingVia: 'feed' | 'save reply' = 'feed'
  const passThroughHost = createPassThroughHost({
    io: {
      ...io,
      load: (load) => {
        messages.push({route: 'host to io', type: 'load', ...load})
        io.load(load)
      },
      resync: (resync) => {
        messages.push({route: 'host to io', type: 'resync', ...resync})
        io.resync(resync)
      },
      transaction: (transaction) => {
        messages.push({
          route: 'host to io',
          type: 'transaction',
          via: arrivingVia,
          ...transaction,
        })
        io.transaction(transaction)
      },
      mutationSent: (mutationSent) => {
        mutationsSent.push(mutationSent)
        messages.push({
          route: 'host to io',
          type: 'mutation sent',
          ...mutationSent,
        })
        io.mutationSent(mutationSent)
      },
      mutationRejected: (mutationRejected) => {
        messages.push({
          route: 'host to io',
          type: 'mutation rejected',
          ...mutationRejected,
        })
        io.mutationRejected(mutationRejected)
      },
      feedLost: () => {
        messages.push({route: 'host to io', type: 'feed lost'})
        io.feedLost()
      },
    },
    save: (batch) => network.send(name, batch),
    resubmit: (request) => {
      const result = server.submit(request.batches, request.transactionId)
      const answer: SaveAnswer =
        result.type === 'saved' ? {type: 'saved'} : result

      if (result.type === 'saved') {
        network.publish(result.transaction)
      }

      messages.push({
        route: 'host to server',
        type: 're-submit',
        transactionId: request.transactionId,
        answer,
      })

      return answer
    },
    hasTransaction: server.hasTransaction,
    fetchCopy: () => server.copy(),
    subscription: () => network.getFeed(name),
    foldBatches: hostShape === 'folding',
    selfConfirming: hostShape === 'self-confirming',
  })
  const host: PassThroughHost = {
    ...passThroughHost,
    reportSaved: (batchId, transaction) => {
      arrivingVia = 'save reply'

      try {
        passThroughHost.reportSaved(batchId, transaction)
      } finally {
        arrivingVia = 'feed'
      }
    },
  }

  network.connect(
    name,
    {
      receiveTransaction: host.forward,
      receiveReply: (reply) => host.reportFailure(reply.batchId, reply.status),
      receiveSaveTaken: host.reportSaveTaken,
    },
    {listening: hostShape !== 'self-confirming'},
  )
  return {
    document,
    io,
    host,
    heard,
    mutationsSent,
    received,
    messages,
    treeMismatches,
    checkedBatchCount: 0,
    checkedErrorCount: 0,
    checkedWarningCount: 0,
    checkedWorkDroppedCount: 0,
  }
}

/**
 * A fake document with the protocol's editor side attached, both minting
 * keys from the same generator, and what their listeners heard. The document
 * is listened to before the editor side attaches, so a change is heard
 * before the batch it leads to. `received` records every message io sends
 * the document, `messages` those and every batch io emits, in order, and
 * `treeMismatches` every moment, right after one of those
 * messages or a local change io has booked, that the document's tree
 * differs from io's working copy.
 */
export function createEditorWithIo({
  id,
  keyGenerator,
  clock,
}: {
  id: string
  keyGenerator: () => string
  clock: Clock
}): {
  document: FakeDocument
  io: Io
  heard: Heard
  received: Array<EditorMessageForIo>
  messages: Array<PathMessage>
  treeMismatches: Array<Omit<TreeMismatch, 'editor'>>
} {
  const heard: Heard = {
    mutations: [],
    changes: [],
    errors: [],
    warnings: [],
    workDropped: [],
    events: [],
  }
  const document = createFakeDocument({keyGenerator}, {value: undefined})

  document.on('change', (event) => {
    const {type: _type, ...change} = event
    heard.changes.push(change)
    heard.events.push({
      type: 'change',
      origin: change.origin,
      patchCount: change.operations.length,
    })
  })

  const received: Array<EditorMessageForIo> = []
  const messages: Array<PathMessage> = []
  const treeMismatches: Array<Omit<TreeMismatch, 'editor'>> = []
  const recordTreeMismatch = (after: TreeMismatch['after']) => {
    const mismatch = findTreeMismatch({document, io}, after)

    if (mismatch) {
      treeMismatches.push(mismatch)
    }
  }
  const io: Io = createIo({
    id,
    editor: {
      on: document.on,
      send: (message) => {
        received.push(message)
        messages.push({route: 'io to editor', ...message})
        document.send(message)
        recordTreeMismatch(message.type)
      },
    },
    keyGenerator,
    clock,
    applyLocalEdit: document.applyLocalEdit,
  })

  document.on('change', (event) => {
    if (event.origin === 'local') {
      recordTreeMismatch('local change')
    }
  })

  io.on((event) => {
    switch (event.type) {
      case 'mutation': {
        const {type: _type, ...batch} = event
        heard.mutations.push(batch)
        messages.push({route: 'io to host', type: 'mutation', ...batch})
        break
      }
      case 'error': {
        const {type: _type, ...error} = event
        heard.errors.push(error)
        heard.events.push({type: 'error', ...error})
        break
      }
      case 'work dropped': {
        const {type: _type, ...workDropped} = event
        heard.workDropped.push(workDropped)
        heard.events.push({
          type: 'work dropped',
          patchCount: workDropped.patches.length,
          ...workDropped,
        })
        break
      }
      case 'warning':
        heard.warnings.push(event.message)
        heard.events.push({type: 'warning', message: event.message})
        break
    }
  })

  return {document, io, heard, received, messages, treeMismatches}
}

/**
 * The editor's tree and io's working copy, when they differ. No field and an
 * empty list are the same tree, the placeholder: one empty text block with
 * the key the document reports for it. Anything else the document shows
 * while it reports a placeholder is compared as content. An editor that has
 * closed has no tree to compare.
 */
function findTreeMismatch(
  {document, io}: {document: FakeDocument; io: Io},
  after: TreeMismatch['after'],
): Omit<TreeMismatch, 'editor'> | undefined {
  if (document.getStatus() === 'unmounted') {
    return undefined
  }

  const value = document.getValue()
  const placeholderKey = document.getPlaceholderKey()
  const tree =
    placeholderKey !== undefined && isPlaceholder(value, placeholderKey)
      ? []
      : value
  const workingCopy = io.getWorkingCopy() ?? []

  return isEqual(tree, workingCopy)
    ? undefined
    : {
        after,
        tree: formatTextspec(tree, {keys: true}),
        workingCopy: formatTextspec(workingCopy, {keys: true}),
      }
}

function isPlaceholder(
  value: Array<PortableTextBlock>,
  placeholderKey: string,
): boolean {
  const [block, ...rest] = value
  const children: unknown = block ? Reflect.get(block, 'children') : undefined
  const [child]: Array<unknown> = Array.isArray(children) ? children : []

  return (
    rest.length === 0 &&
    block?._key === placeholderKey &&
    block._type === 'block' &&
    Array.isArray(children) &&
    children.length === 1 &&
    typeof child === 'object' &&
    child !== null &&
    Reflect.get(child, '_type') === 'span' &&
    Reflect.get(child, 'text') === ''
  )
}

const namedTransactionPrefixes: Record<NamedTransaction, string> = {
  'the other field': 'other-field',
  "the script's change": 'script',
  "the script's corruption": 'corruption',
  'the deletion': 'deletion',
  'the recreation': 'recreation',
}

/**
 * Stored content as one line of textspec, with each block textspec can't
 * spell, below the floor, written as its JSON instead.
 */
function formatStoredTextspec(value: Array<PortableTextBlock>): string {
  return value
    .map((block) => {
      try {
        return formatTextspec([block])
      } catch {
        return JSON.stringify(block)
      }
    })
    .join(';;')
}

/** The patches a script sends to corrupt the block with the key. */
function corruptionPatches(
  value: Array<PortableTextBlock> | undefined,
  key: string,
  corruption: Corruption,
): Array<Patch> {
  const block = value?.find((candidate) => candidate._key === key)
  const path = [{_key: key}]

  if (!block) {
    throw new Error(`The server has no block "${key}"`)
  }

  switch (corruption.type) {
    case 'no key':
      return [unset([...path, '_key'])]
    case 'no type':
      return [unset([...path, '_type'])]
    case 'children':
      return [set(corruption.children, [...path, 'children'])]
    case 'span text': {
      const children: unknown = Reflect.get(block, 'children')
      const [span]: Array<unknown> = Array.isArray(children) ? children : []
      const spanKey: unknown =
        typeof span === 'object' && span !== null
          ? Reflect.get(span, '_key')
          : undefined

      if (typeof spanKey !== 'string') {
        throw new Error(`The server's block "${key}" has no keyed span`)
      }

      return [
        set(corruption.text, [...path, 'children', {_key: spanKey}, 'text']),
      ]
    }
    case 'string':
      return [set(corruption.value, path)]
  }
}

function toEditorName(editorId: string): EditorName {
  if (editorId === 'Editor A' || editorId === 'Editor B') {
    return editorId
  }

  throw new Error(`No editor "${editorId}"`)
}
