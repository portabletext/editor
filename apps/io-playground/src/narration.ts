import {
  editorNames,
  type BatchSnapshot,
  type EditorName,
  type EditorSnapshot,
  type NetworkSnapshot,
  type ServerSnapshot,
  type TransactionSource,
  type WorldSnapshot,
} from '@portabletext/io'
import {plural} from './ui'

type Patch = BatchSnapshot['patches'][number]

type FeedItem = NetworkSnapshot['feeds'][EditorName][number]

export type NarrationEntry = {
  /** The step as written in Gherkin. */
  step: string
  sentences: Array<string>
}

/**
 * The narration for one step. A check that changes nothing says nothing, and
 * an action that changes nothing says so.
 */
export function narrateStep({
  step,
  isAction,
  before,
  after,
}: {
  step: string
  isAction: boolean
  before: WorldSnapshot
  after: WorldSnapshot
}): Array<NarrationEntry> {
  const sentences = narrate(before, after)

  if (sentences.length > 0) {
    return [{step, sentences}]
  }

  return isAction ? [{step, sentences: ['Nothing changed.']}] : []
}

/**
 * One plain sentence per thing that changed between two snapshots of the
 * same world.
 */
function narrate(before: WorldSnapshot, after: WorldSnapshot): Array<string> {
  if (!after.editors || !after.server || !after.network) {
    return []
  }

  if (!before.editors || !before.server || !before.network) {
    return [
      describeServerStart(after.server),
      ...editorNames.map((name) => describeEditorStart(name, after)),
    ]
  }

  const sentences: Array<string> = []

  for (const name of editorNames) {
    sentences.push(
      ...narrateEditor({
        name,
        before: before.editors[name],
        after: after.editors[name],
        beforeNetwork: before.network,
        afterNetwork: after.network,
      }),
    )
  }

  sentences.push(
    ...narrateServer({
      before: before.server,
      after: after.server,
      beforeNetwork: before.network,
      afterNetwork: after.network,
    }),
  )

  if (after.network.now !== before.network.now) {
    sentences.push(
      `The clock moved ${(after.network.now - before.network.now) / 1000} s ahead to t = ${after.network.now / 1000} s.`,
    )
  }

  return sentences
}

function narrateEditor({
  name,
  before,
  after,
  beforeNetwork,
  afterNetwork,
}: {
  name: EditorName
  before: EditorSnapshot
  after: EditorSnapshot
  beforeNetwork: NetworkSnapshot
  afterNetwork: NetworkSnapshot
}): Array<string> {
  const sentences: Array<string> = []
  const newBatches = after.sentBatches.slice(before.sentBatches.length)
  const explainedBatchNumbers = new Set<number>()
  const newEvents = after.events.slice(before.events.length)
  const newErrors = newEvents.flatMap((event) =>
    event.type === 'error' ? [event] : [],
  )
  const deliveredItems = beforeNetwork.feeds[name].filter(
    (item) =>
      !afterNetwork.feeds[name].some(
        (candidate) => candidate.transactionId === item.transactionId,
      ),
  )
  const screenChanged = before.screen !== after.screen
  const blocksChanged =
    JSON.stringify(before.blocks) !== JSON.stringify(after.blocks)
  let screenExplained = false

  if (before.status !== after.status) {
    if (before.status === 'loading' && after.status === 'ready') {
      screenExplained = true
      sentences.push(
        before.base.rev === after.base.rev &&
          before.base.textspec === after.base.textspec
          ? `${name} is ready without a load.`
          : `${name} loaded the server's copy at ${describeRev(after.base.rev)} and is ready, showing \`${after.screen}\`.`,
      )
    } else if (after.status === 'unmounted') {
      sentences.push(`${name} closed and unmounted.`)
    } else {
      sentences.push(`${name} is now ${after.status}.`)
    }
  }

  for (const reply of beforeNetwork.replies) {
    if (
      reply.editor !== name ||
      afterNetwork.replies.some(
        (candidate) => candidate.batchId === reply.batchId,
      )
    ) {
      continue
    }

    if (
      after.rejected?.batchNumber === reply.batchNumber &&
      before.rejected?.batchNumber !== reply.batchNumber
    ) {
      sentences.push(
        `${name} got the rejection for batch ${reply.batchNumber}, so ${name} sends nothing more until a resync.`,
      )
    } else {
      sentences.push(
        `${name} got the rejection for batch ${reply.batchNumber}.`,
      )
    }
  }

  for (const item of deliveredItems) {
    screenExplained = true
    const ownBatchNumbers = ownBatches(item.source, name)
    const failed = newErrors.some(
      (error) => error.transactionId === item.transactionId,
    )

    if (before.outOfStep) {
      sentences.push(
        ownBatchNumbers.length > 0
          ? `${item.transactionId} came back to ${name} while out of step: it notes that ${describeBatchNumbers(ownBatchNumbers)} came back and applies nothing.`
          : `${name} is out of step and ignored ${item.transactionId}.`,
      )
      continue
    }

    if (after.held.some((held) => held.transactionId === item.transactionId)) {
      sentences.push(
        `${name} held ${item.transactionId}: it doesn't connect to ${describeRev(before.base.rev)} (it starts at ${describeRev(item.previousRev)})${
          ownBatchNumbers.length > 0
            ? `, so ${describeBatchNumbers(ownBatchNumbers)} waits as a held echo`
            : ''
        }.`,
      )
      continue
    }

    if (failed) {
      continue
    }

    if (ownBatchNumbers.length > 0) {
      const confirmed = ownBatchNumbers.filter(
        (batchNumber) =>
          after.inFlight?.batchNumber !== batchNumber &&
          !after.echoed.some((batch) => batch.batchNumber === batchNumber),
      )
      const followUp = newBatches.at(0)
      const parts = [
        confirmed.length > 0
          ? `${describeBatchNumbers(confirmed)} confirmed`
          : `${describeBatchNumbers(ownBatchNumbers)} not confirmed yet`,
      ]

      if (followUp) {
        explainedBatchNumbers.add(followUp.number)
        parts.push(
          `batch ${followUp.number} went out with ${
            before.pending.length === 1
              ? 'the pending change'
              : `the ${before.pending.length} pending changes`
          }`,
        )
      }

      if (blocksChanged) {
        parts.push(`it shows \`${after.screen}\``)
      }

      sentences.push(
        `${item.transactionId} came back to ${name}: ${parts.join(', ')}.`,
      )
      continue
    }

    sentences.push(
      blocksChanged
        ? `${name} received ${item.transactionId} and shows \`${after.screen}\`.`
        : `${name} received ${item.transactionId}: its base moved to ${describeRev(after.base.rev)} and the screen didn't change.`,
    )
  }

  const released = before.held.filter(
    (held) =>
      !after.held.some(
        (candidate) => candidate.transactionId === held.transactionId,
      ),
  )
  const resynced =
    deliveredItems.length === 0 &&
    before.status === 'ready' &&
    after.status === 'ready' &&
    (before.base.rev !== after.base.rev ||
      before.base.textspec !== after.base.textspec ||
      (before.outOfStep && !after.outOfStep) ||
      (before.rejected !== null && after.rejected === null) ||
      (released.length > 0 && !after.outOfStep))

  if (deliveredItems.length > 0 && !after.outOfStep && released.length > 0) {
    const confirmedEchoes = before.echoed
      .filter(
        (batch) =>
          !after.echoed.some(
            (candidate) => candidate.batchNumber === batch.batchNumber,
          ),
      )
      .map((batch) => batch.batchNumber)

    sentences.push(
      `${name} applied the held ${joinPhrases(released.map((held) => held.transactionId))} now that it connects${
        confirmedEchoes.length > 0
          ? `: ${describeBatchNumbers(confirmedEchoes)} confirmed`
          : ''
      }.`,
    )
  }

  if (resynced) {
    screenExplained = true
    const followUp = newBatches.at(0)
    const parts = [
      `${name} took a fresh copy at ${describeRev(after.base.rev)}`,
    ]

    if (followUp) {
      explainedBatchNumbers.add(followUp.number)
      parts.push(
        `re-applied ${plural(before.pending.length, 'unsent change')}, which went out as batch ${followUp.number}`,
      )
    } else if (before.pending.length > 0) {
      parts.push(`dropped ${plural(before.pending.length, 'unsent change')}`)
    }

    if (before.rejected) {
      parts.push(`let go of the rejected batch ${before.rejected.batchNumber}`)
    }

    if (before.outOfStep && !after.outOfStep) {
      parts.push('is back in step')
    }

    if (screenChanged) {
      parts.push(`shows \`${after.screen}\``)
    }

    sentences.push(`${joinPhrases(parts)}.`)
  }

  if (screenChanged && !screenExplained) {
    sentences.push(
      blocksChanged
        ? `${name} shows \`${after.screen}\`.`
        : `${name} moved the caret: \`${after.screen}\`.`,
    )
  }

  const newPending = after.pending.slice(before.pending.length)

  if (newPending.length > 0) {
    sentences.push(
      `${name} kept the change (${describePatches(newPending.flatMap((change) => change.patches))}) as pending, because ${
        after.inFlight
          ? `batch ${after.inFlight.batchNumber} is still in flight`
          : after.rejected
            ? `batch ${after.rejected.batchNumber} was rejected`
            : `it isn't ready`
      }.`,
    )
  }

  for (const batch of newBatches) {
    if (explainedBatchNumbers.has(batch.number)) {
      continue
    }

    sentences.push(
      `${name} sent batch ${batch.number} as transaction ${batch.transactionId}${
        batch.final ? ', its final batch' : ''
      }: ${describePatches(batch.patches)}.`,
    )
  }

  if (!before.outOfStep && after.outOfStep) {
    sentences.push(
      `${name} is out of step: it stopped applying the feed until a resync.`,
    )
  }

  for (const event of newEvents) {
    if (event.type === 'error') {
      sentences.push(
        `${name} reported ${event.reason}${
          event.transactionId === undefined ? '' : ` on ${event.transactionId}`
        }.`,
      )
    }

    if (event.type === 'warning') {
      sentences.push(`${name} warned: ${event.message}.`)
    }
  }

  if (!before.readOnly && after.readOnly) {
    sentences.push(
      `${name} became read-only: it refuses user changes and keeps applying the feed.`,
    )
  }

  return sentences
}

function narrateServer({
  before,
  after,
  beforeNetwork,
  afterNetwork,
}: {
  before: ServerSnapshot
  after: ServerSnapshot
  beforeNetwork: NetworkSnapshot
  afterNetwork: NetworkSnapshot
}): Array<string> {
  const sentences: Array<string> = []

  for (const transaction of after.transactions.slice(
    before.transactions.length,
  )) {
    const revisions = `${describeRev(transaction.previousRev)} → ${describeRev(transaction.resultRev)}`

    if (transaction.source.type === 'named') {
      switch (transaction.source.name) {
        case 'the other field':
          sentences.push(
            `Another field changed on the server as ${transaction.id}: ${revisions}, and this field stayed the same.`,
          )
          break
        case "the script's change":
          sentences.push(
            `A script set the whole field on the server as ${transaction.id}: ${revisions}, to ${after.value === null ? 'no field' : `\`${after.value}\``}.`,
          )
          break
        case 'the deletion':
          sentences.push(
            `The document was deleted on the server as ${transaction.id}: ${revisions}.`,
          )
          break
        case 'the recreation':
          sentences.push(
            `The document was recreated on the server as ${transaction.id}: ${revisions}, with ${after.value === null ? 'no field' : `\`${after.value}\``}.`,
          )
          break
      }
      continue
    }

    sentences.push(
      `The server saved ${transaction.id} (${describeSource(transaction.source)}): ${revisions}${
        transaction.noop ? ' and nothing changed' : ''
      }.`,
    )
  }

  for (const request of beforeNetwork.saveRequests) {
    const refused = afterNetwork.replies.some(
      (reply) =>
        reply.batchId === request.batchId &&
        !beforeNetwork.replies.some(
          (candidate) => candidate.batchId === request.batchId,
        ),
    )

    if (refused) {
      sentences.push(
        `The server refused ${request.editor}'s batch ${request.batchNumber}, and a rejection is on its way back.`,
      )
    }
  }

  return sentences
}

function describeServerStart(server: ServerSnapshot): string {
  if (server.rev === null) {
    return 'The server has no document yet.'
  }

  return server.value === null
    ? `The server starts at ${server.rev} with no field.`
    : `The server starts at ${server.rev} with ${server.value === '' ? 'an empty list' : `\`${server.value}\``}.`
}

function describeEditorStart(name: EditorName, world: WorldSnapshot): string {
  const editor = world.editors?.[name]

  if (!editor) {
    return `${name} doesn't exist.`
  }

  return editor.status === 'ready'
    ? `${name} is ready and shows \`${editor.screen}\`.`
    : `${name} is ${editor.status} and waits for its first load.`
}

function ownBatches(
  source: TransactionSource,
  name: EditorName,
): Array<number> {
  return source.type === 'batches'
    ? source.batches
        .filter((batch) => batch.name === name)
        .map((batch) => batch.batchNumber)
    : []
}

function describeBatchNumbers(batchNumbers: Array<number>): string {
  return batchNumbers.length === 1
    ? `batch ${batchNumbers[0]}`
    : `batches ${joinPhrases(batchNumbers.map(String))}`
}

function describeRev(rev: string | null): string {
  return rev ?? 'no document'
}

export function describeSource(source: TransactionSource): string {
  return source.type === 'named'
    ? source.name
    : source.batches
        .map((batch) => `${batch.name}'s batch ${batch.batchNumber}`)
        .join(' + ')
}

export function isOwnFeedItem(item: FeedItem, name: EditorName): boolean {
  return ownBatches(item.source, name).length > 0
}

/**
 * The patches in words, where that's cheap, or else a count.
 */
export function describePatches(patches: Array<Patch>): string {
  if (patches.length === 0) {
    return 'no patches'
  }

  const phrases: Array<string> = []

  for (let index = 0; index < patches.length; index++) {
    const patch = patches[index]
    const nextPatch = patches[index + 1]

    if (
      patch.type === 'setIfMissing' &&
      patch.path.length === 0 &&
      nextPatch?.type === 'insert'
    ) {
      phrases.push('created the block')
      index++
      continue
    }

    const phrase = describePatch(patch)

    if (phrase === undefined) {
      return plural(patches.length, 'patch')
    }

    phrases.push(phrase)
  }

  return phrases.length > 3
    ? plural(patches.length, 'patch')
    : joinPhrases(phrases)
}

function describePatch(patch: Patch): string | undefined {
  const lastSegment = patch.path.at(-1)

  switch (patch.type) {
    case 'set':
      if (patch.path.length === 0) {
        return 'replaced the whole field'
      }

      return lastSegment === 'style'
        ? `set the style to ${String(patch.value)}`
        : undefined
    case 'unset':
      if (patch.path.length === 0) {
        return 'emptied the field (a whole-field unset)'
      }

      if (patch.path.length === 1) {
        return 'deleted a block'
      }

      return lastSegment === 'style' ? 'removed the style' : undefined
    case 'insert':
      return patch.items.length === 1
        ? 'inserted a block'
        : `inserted ${patch.items.length} blocks`
    case 'diffMatchPatch':
      return describeTextDiff(patch.value)
    default:
      return undefined
  }
}

function describeTextDiff(diff: string): string | undefined {
  const lines = diff.split('\n')
  const added = decodeDiffText(lines, '+')
  const removed = decodeDiffText(lines, '-')

  if (added === undefined || removed === undefined) {
    return undefined
  }

  if (added !== '' && removed === '') {
    return `typed "${added}"`
  }

  if (removed !== '' && added === '') {
    return `deleted "${removed}"`
  }

  return added === '' ? undefined : `replaced "${removed}" with "${added}"`
}

function decodeDiffText(
  lines: Array<string>,
  sign: '+' | '-',
): string | undefined {
  try {
    return lines
      .filter((line) => line.startsWith(sign))
      .map((line) => decodeURI(line.slice(1)))
      .join('')
  } catch {
    return undefined
  }
}

function joinPhrases(phrases: Array<string>): string {
  if (phrases.length <= 1) {
    return phrases.join('')
  }

  return `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}`
}
