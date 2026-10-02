import {
  editorNames,
  type MutationSnapshot,
  type EditorName,
  type EditorSnapshot,
  type NetworkSnapshot,
  type ServerSnapshot,
  type TransactionSource,
  type WorldSnapshot,
} from '@portabletext/io/testing'
import {plural} from './ui'

type Patch = MutationSnapshot['patches'][number]

type FeedItem = NetworkSnapshot['feeds'][EditorName][number]

/**
 * A transaction that reached an editor's host in a step: from the feed and
 * forwarded, from the feed and dropped as covered by the last copy, or from
 * the answer to the host's own save.
 */
type ArrivedTransaction = Pick<
  FeedItem,
  'transactionId' | 'previousRev' | 'resultRev' | 'source'
> & {via: 'feed' | 'save reply' | 'dropped'}

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
        beforeDuplicates: before.server.duplicates.filter((duplicate) =>
          duplicate.mutations.some((mutation) => mutation.name === name),
        ),
        afterDuplicates: after.server.duplicates.filter((duplicate) =>
          duplicate.mutations.some((mutation) => mutation.name === name),
        ),
        afterServer: after.server,
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
  beforeDuplicates,
  afterDuplicates,
  afterServer,
}: {
  name: EditorName
  before: EditorSnapshot
  after: EditorSnapshot
  beforeNetwork: NetworkSnapshot
  afterNetwork: NetworkSnapshot
  beforeDuplicates: ServerSnapshot['duplicates']
  afterDuplicates: ServerSnapshot['duplicates']
  afterServer: ServerSnapshot
}): Array<string> {
  const sentences: Array<string> = []
  const newMessages = after.messages.slice(before.messages.length)
  const newMutations = after.sentMutations.slice(before.sentMutations.length)
  const explainedMutationNumbers = new Set<number>()
  const newEvents = after.events.slice(before.events.length)
  const newErrors = newEvents.flatMap((event) =>
    event.type === 'error' ? [event] : [],
  )
  const forwarded = new Set(
    newMessages.flatMap((message) =>
      message.type === 'transaction' ? [message.transactionId] : [],
    ),
  )
  const deliveredItems: Array<ArrivedTransaction> = [
    ...beforeNetwork.feeds[name]
      .filter(
        (item) =>
          !afterNetwork.feeds[name].some(
            (candidate) => candidate.transactionId === item.transactionId,
          ),
      )
      .map((item) => ({
        ...item,
        via: forwarded.has(item.transactionId)
          ? ('feed' as const)
          : ('dropped' as const),
      })),
    ...newMessages.flatMap((message) => {
      const transaction =
        message.type === 'transaction' && message.via === 'save reply'
          ? afterServer.transactions.find(
              (candidate) => candidate.id === message.transactionId,
            )
          : undefined

      return transaction
        ? [
            {
              transactionId: transaction.id,
              previousRev: transaction.previousRev,
              resultRev: transaction.resultRev,
              source: transaction.source,
              via: 'save reply' as const,
            },
          ]
        : []
    }),
  ]
  const resyncMessage = newMessages.find(
    (message) => message.route === 'host to io' && message.type === 'resync',
  )
  const resyncTook = newMessages.some(
    (message) => message.route === 'io to editor' && message.type === 'resync',
  )
  const screenChanged = before.screen !== after.screen
  const blocksChanged =
    JSON.stringify(before.blocks) !== JSON.stringify(after.blocks)
  let screenExplained = false

  if (before.status !== after.status) {
    if (before.status === 'loading' && after.status === 'ready') {
      screenExplained = true
      sentences.push(
        after.base.rev === null && after.base.textspec === null
          ? `${name}'s first commit ended and it is ready, empty.`
          : `${name}'s first commit ended and it is ready, showing \`${after.screen}\` from the server's copy at ${describeRev(after.base.rev)}.`,
      )
    } else if (after.status === 'unmounted') {
      sentences.push(`${name} closed and unmounted.`)
    } else {
      sentences.push(`${name} is now ${after.status}.`)
    }
  } else if (
    after.status === 'loading' &&
    newMessages.some(isLoadOfTheEditor)
  ) {
    screenExplained = true
    sentences.push(
      before.messages.some(isLoadOfTheEditor)
        ? `${name} was loaded again before ready: the second load replaces the first, so it holds the server's copy at ${describeRev(after.base.rev)} (\`${after.screen}\`) and becomes ready with it when its first commit ends.`
        : `${name} took the server's copy at ${describeRev(after.base.rev)} as its first content, and becomes ready with it when its first commit ends.`,
    )
  }

  for (const reply of beforeNetwork.replies) {
    if (
      reply.editor !== name ||
      afterNetwork.replies.some(
        (candidate) => candidate.mutationId === reply.mutationId,
      )
    ) {
      continue
    }

    if (
      after.rejected?.mutationNumber === reply.mutationNumber &&
      before.rejected?.mutationNumber !== reply.mutationNumber
    ) {
      sentences.push(
        `${name}'s host got the ${reply.status} for mutation ${reply.mutationNumber} and reported the rejection, so ${name} sends nothing more until a resync.`,
      )
    } else {
      sentences.push(
        `${name}'s host got the ${reply.status} for mutation ${reply.mutationNumber}.`,
      )
    }
  }

  for (const reply of afterNetwork.lostReplies) {
    if (
      reply.editor === name &&
      !beforeNetwork.lostReplies.some(
        (candidate) => candidate.mutationId === reply.mutationId,
      )
    ) {
      sentences.push(
        `The save reply for ${name}'s mutation ${reply.mutationNumber} was lost: the server saved it, but ${name}'s host never heard back.`,
      )
    }
  }

  for (const reply of beforeNetwork.lostReplies) {
    if (
      reply.editor !== name ||
      afterNetwork.lostReplies.some(
        (candidate) => candidate.mutationId === reply.mutationId,
      )
    ) {
      continue
    }

    const transactionId =
      after.sentMutations[reply.mutationNumber - 1]?.transactionId ??
      reply.mutationId

    sentences.push(
      afterDuplicates.length > beforeDuplicates.length
        ? `${name}'s host retried mutation ${reply.mutationNumber} with the same transaction ID, ${transactionId}: the server already has it and refused the retry with a 409, so the mutation landed once.`
        : `${name}'s host retried mutation ${reply.mutationNumber} with the same transaction ID, ${transactionId}.`,
    )
  }

  for (const item of deliveredItems) {
    if (item.via === 'dropped') {
      sentences.push(
        `${name}'s host dropped ${item.transactionId} on arrival: the copy it fetched for the last load or resync covers it already.`,
      )
      continue
    }

    screenExplained = true
    const ownMutationNumbers = ownMutations(item.source, name)
    const failed = newErrors.some(
      (error) => error.transactionId === item.transactionId,
    )
    const arrived =
      item.via === 'save reply'
        ? `${name}'s host forwarded ${item.transactionId} from the answer to its own save`
        : `${item.transactionId} came back to ${name}`

    if (isOutOfStep(before)) {
      sentences.push(
        ownMutationNumbers.length > 0
          ? `${item.transactionId} came back to ${name} while out of step: it notes that ${describeMutationNumbers(ownMutationNumbers)} came back and applies nothing.`
          : `${name} is out of step and ignored ${item.transactionId}.`,
      )
      continue
    }

    if (after.held.some((held) => held.transactionId === item.transactionId)) {
      sentences.push(
        `${name} held ${item.transactionId}: it doesn't connect to ${describeRev(before.base.rev)} (it starts at ${describeRev(item.previousRev)})${
          ownMutationNumbers.length > 0
            ? `, so ${describeMutationNumbers(ownMutationNumbers)} waits as a held echo`
            : ''
        }.`,
      )
      continue
    }

    if (failed) {
      continue
    }

    if (ownMutationNumbers.length > 0) {
      const confirmed = ownMutationNumbers.filter(
        (mutationNumber) =>
          after.inFlight?.mutationNumber !== mutationNumber &&
          !after.echoed.some(
            (mutation) => mutation.mutationNumber === mutationNumber,
          ),
      )
      const followUp = newMutations.at(0)
      const parts = [
        confirmed.length > 0
          ? `${describeMutationNumbers(confirmed)} confirmed`
          : `${describeMutationNumbers(ownMutationNumbers)} not confirmed yet`,
      ]

      if (followUp) {
        explainedMutationNumbers.add(followUp.number)
        parts.push(
          `mutation ${followUp.number} went out with ${
            before.pending.length === 1
              ? 'the pending change'
              : `the ${before.pending.length} pending changes`
          }`,
        )
      }

      if (blocksChanged) {
        parts.push(`it shows \`${after.screen}\``)
      }

      sentences.push(`${arrived}: ${parts.join(', ')}.`)
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
  if (deliveredItems.length > 0 && !isOutOfStep(after) && released.length > 0) {
    const confirmedEchoes = before.echoed
      .filter(
        (mutation) =>
          !after.echoed.some(
            (candidate) => candidate.mutationNumber === mutation.mutationNumber,
          ),
      )
      .map((mutation) => mutation.mutationNumber)

    sentences.push(
      `${name} applied the held ${joinPhrases(released.map((held) => held.transactionId))} now that it connects${
        confirmedEchoes.length > 0
          ? `: ${describeMutationNumbers(confirmedEchoes)} confirmed`
          : ''
      }.`,
    )
  }

  for (const message of newMessages) {
    if (message.type === 'mutation sent') {
      sentences.push(
        `${name}'s host formed the request for mutation ${mutationNumberOf(after, message.id)} under its own transaction ID, ${message.transactionId}, and told io with \`mutation sent\`.`,
      )
    }

    if (message.type === 're-submit' && resyncMessage) {
      sentences.push(
        `${name}'s host re-submitted the frozen request ${message.transactionId} to find out what became of the mutation in flight: ${
          message.answer.type === 'duplicate'
            ? 'the server answered 409, the transaction ID exists, so the mutation had landed'
            : message.answer.type === 'saved'
              ? "the server saved it, so it hadn't landed before and has now"
              : `it failed with ${message.answer.status}, so the mutation never landed`
        }.`,
      )
    }
  }

  if (resyncMessage && !resyncTook) {
    sentences.push(`${name} refused the resync.`)
  }

  if (resyncTook) {
    screenExplained = true
    const followUp = newMutations.at(0)
    const outcome =
      resyncMessage?.type === 'resync' && before.inFlight
        ? resyncMessage.outcomes?.[
            mutationIdOf(after, before.inFlight.mutationNumber) ?? ''
          ]
        : undefined
    const parts = [
      `${name} took a fresh copy at ${describeRev(after.base.rev)}`,
    ]

    if (before.inFlight && outcome !== undefined) {
      parts.push(
        outcome === 'applied'
          ? `let go of mutation ${before.inFlight.mutationNumber}: it landed, so it is in the copy`
          : `put mutation ${before.inFlight.mutationNumber} back with the unsent changes: it never landed`,
      )
    }

    if (followUp) {
      explainedMutationNumbers.add(followUp.number)
      parts.push(
        before.pending.length > 0 || outcome === 'not applied'
          ? `re-applied the unsent changes, which went out as mutation ${followUp.number}`
          : `repaired the copy to the floor and sent the repair as mutation ${followUp.number}`,
      )
    } else if (before.pending.length > 0) {
      parts.push(`dropped ${plural(before.pending.length, 'unsent change')}`)
    }

    if (before.rejected) {
      parts.push(
        `let go of the rejected mutation ${before.rejected.mutationNumber}`,
      )
    }

    if (isOutOfStep(before) && !isOutOfStep(after)) {
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
          ? `mutation ${after.inFlight.mutationNumber} is still in flight`
          : after.rejected
            ? `mutation ${after.rejected.mutationNumber} was rejected`
            : `it isn't ready`
      }.`,
    )
  }

  for (const mutation of newMutations) {
    if (explainedMutationNumbers.has(mutation.number)) {
      continue
    }

    sentences.push(
      `${name} sent mutation ${mutation.number}, proposing transaction ID ${mutation.transactionId}${
        mutation.final ? ', its final mutation' : ''
      }: ${describePatches(mutation.patches)}.`,
    )
  }

  if (!isOutOfStep(before) && isOutOfStep(after)) {
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

    if (event.type === 'work dropped') {
      sentences.push(
        `${name} dropped ${plural(event.patchCount, 'patch')}: ${
          event.reason === 'no target'
            ? event.patchCount === 1
              ? 'its target is gone'
              : 'their targets are gone'
            : event.reason === 'rejected'
              ? 'the resync dropped the rejected mutation'
              : event.reason === 'closed out of step'
                ? 'it closed while out of step'
                : 'it closed while sending was blocked'
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
        case "the script's corruption":
          sentences.push(
            `A script changed the field on the server as ${transaction.id}: ${revisions}, leaving a block the editor cannot hold.`,
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

  if (
    after.transactions.length === before.transactions.length &&
    JSON.stringify(after.blocks) !== JSON.stringify(before.blocks)
  ) {
    sentences.push(
      `The server's copy changed without a transaction, still at ${describeRev(after.rev)}, so no feed hears of it: only a load or a resync fetches it.`,
    )
  }

  for (const request of beforeNetwork.saveRequests) {
    const failure = afterNetwork.replies.find(
      (reply) =>
        reply.mutationId === request.mutationId &&
        !beforeNetwork.replies.some(
          (candidate) => candidate.mutationId === request.mutationId,
        ),
    )

    if (failure) {
      sentences.push(
        `The request for ${request.editor}'s mutation ${request.mutationNumber} failed with ${failure.status}, and the reply is on its way back.`,
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

function isLoadOfTheEditor(message: EditorSnapshot['messages'][number]) {
  return message.route === 'io to editor' && message.type === 'load'
}

function isOutOfStep(editor: EditorSnapshot): boolean {
  return editor.io.sync === 'out of step'
}

function mutationNumberOf(editor: EditorSnapshot, mutationId: string): number {
  return (
    editor.messages
      .flatMap((message) => (message.type === 'mutation' ? [message.id] : []))
      .indexOf(mutationId) + 1
  )
}

function mutationIdOf(
  editor: EditorSnapshot,
  mutationNumber: number,
): string | undefined {
  return editor.messages.flatMap((message) =>
    message.type === 'mutation' ? [message.id] : [],
  )[mutationNumber - 1]
}

function ownMutations(
  source: TransactionSource,
  name: EditorName,
): Array<number> {
  return source.type === 'mutations'
    ? source.mutations
        .filter((mutation) => mutation.name === name)
        .map((mutation) => mutation.mutationNumber)
    : []
}

function describeMutationNumbers(mutationNumbers: Array<number>): string {
  return mutationNumbers.length === 1
    ? `mutation ${mutationNumbers[0]}`
    : `mutations ${joinPhrases(mutationNumbers.map(String))}`
}

function describeRev(rev: string | null): string {
  return rev ?? 'no document'
}

export function describeSource(source: TransactionSource): string {
  return source.type === 'named'
    ? source.name
    : source.mutations
        .map(
          (mutation) =>
            `${mutation.name}'s mutation ${mutation.mutationNumber}`,
        )
        .join(' + ')
}

export function isOwnFeedItem(item: FeedItem, name: EditorName): boolean {
  return ownMutations(item.source, name).length > 0
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

export function decodeDiffText(
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
