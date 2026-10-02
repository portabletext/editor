import type {
  EditorName,
  EditorSnapshot,
  NetworkSnapshot,
  WorldSnapshot,
} from '@portabletext/io/testing'

/**
 * Whether the protocol lets an action happen now, why not, and the prompt
 * when the state calls for it.
 */
export type Applicability = {enabled: boolean; why?: string; suggested?: string}

export type EditorAction =
  | 'type'
  | 'set style'
  | 'put caret after'
  | 'insert block'
  | 'delete block'
  | 'delete before caret'
  | 'undo'
  | 'read-only'
  | 'close'
  | 'resync'
  | 'resync discarding'
  | 'load'
  | 'end first commit'

export type EditorApplicability = Record<EditorAction, Applicability>

export type LinkApplicability = {
  towardServer: {
    prompts: Array<string>
    /** By mutation ID. */
    saveRequests: Record<string, Applicability>
    /** Receiving a save request and losing its reply, by mutation ID. */
    loseReply: Record<string, Applicability>
  }
  towardEditor: {
    prompts: Array<string>
    /** By mutation ID. */
    replies: Record<string, Applicability>
    /** Retrying the save whose reply was lost, by mutation ID. */
    lostReplies: Record<string, Applicability>
    /** By transaction ID. */
    feed: Record<string, Applicability>
  }
  /** The host telling the editor its listener missed transactions. */
  feedLost: Applicability
  /** The prompt when the editor holds a transaction that doesn't connect. */
  held: string | undefined
}

export type NetworkApplicability = {
  links: Record<EditorName, LinkApplicability>
  advanceClock: Applicability
}

type FeedItem = NetworkSnapshot['feeds'][EditorName][number]

const enabled: Applicability = {enabled: true}

const whyUnmounted = 'the editor is unmounted'
const whyLoading = "the editor isn't ready yet"
const whyReadOnly = 'typing is blocked while read-only'

export function applicableActions(
  snapshot: WorldSnapshot,
  editorName: EditorName,
): EditorApplicability {
  const editor = snapshot.editors?.[editorName]

  if (!editor) {
    const noEditor = disabled('there are no editors yet')

    return {
      'type': noEditor,
      'set style': noEditor,
      'put caret after': noEditor,
      'insert block': noEditor,
      'delete block': noEditor,
      'delete before caret': noEditor,
      'undo': noEditor,
      'read-only': noEditor,
      'close': noEditor,
      'resync': noEditor,
      'resync discarding': noEditor,
      'load': noEditor,
      'end first commit': noEditor,
    }
  }

  const {status, pending} = editor.io
  const edit = editApplicability(editor)
  const resync = resyncApplicability(editor)

  return {
    'type': edit,
    'set style': edit,
    'put caret after':
      status === 'unmounted' ? disabled(whyUnmounted) : enabled,
    'insert block': edit,
    'delete block': edit,
    'delete before caret': edit,
    'undo':
      edit.enabled && editor.undoDepth === 0
        ? disabled('there is nothing to undo')
        : edit,
    'read-only':
      status === 'unmounted'
        ? disabled(whyUnmounted)
        : editor.readOnly
          ? disabled('the steps have no way to end read-only')
          : enabled,
    'close': status === 'unmounted' ? disabled(whyUnmounted) : enabled,
    'resync': {...resync, ...resyncSuggestion(editorName, editor, resync)},
    'resync discarding': !resync.enabled
      ? resync
      : editor.io.inFlight
        ? disabled('the steps discard only when no mutation is in flight')
        : pending === 0
          ? disabled('nothing unsent to discard')
          : {
              enabled: true,
              why: `the user's choice: load the saved version and throw away ${pending} unsent change(s)`,
            },
    'load': firstCommitApplicability(
      editorName,
      editor,
      'after ready a load throws: resync takes over',
    ),
    'end first commit': firstCommitApplicability(
      editorName,
      editor,
      'the first commit has ended',
    ),
  }
}

/**
 * The distinct prompts of an editor's suggested actions, in action order.
 */
export function editorPrompts(actions: EditorApplicability): Array<string> {
  return unique(
    Object.values(actions).flatMap((action) =>
      action.suggested === undefined ? [] : [action.suggested],
    ),
  )
}

/**
 * `deadFeeds` names the editors whose listener the network has stopped
 * delivering to.
 */
export function applicableNetworkActions(
  snapshot: WorldSnapshot,
  deadFeeds: ReadonlyArray<EditorName> = [],
): NetworkApplicability {
  const link = (name: EditorName) =>
    linkApplicability(
      name,
      snapshot.editors?.[name],
      snapshot.network,
      deadFeeds.includes(name),
    )
  const links = {'Editor A': link('Editor A'), 'Editor B': link('Editor B')}
  const anyHeld = Object.values(links).some((link) => link.held !== undefined)

  return {
    links,
    advanceClock: anyHeld
      ? {enabled: true, suggested: 'advance 10 s to end the wait'}
      : enabled,
  }
}

function editApplicability(editor: EditorSnapshot): Applicability {
  if (editor.io.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.io.status === 'loading') {
    return disabled(whyLoading)
  }

  return editor.readOnly ? disabled(whyReadOnly) : enabled
}

function resyncApplicability(editor: EditorSnapshot): Applicability {
  if (editor.io.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.io.status === 'loading') {
    return disabled('resync is only accepted once ready')
  }

  const inFlightNumber = inFlightMutationNumber(editor)

  return inFlightNumber === undefined
    ? enabled
    : {
        enabled: true,
        why: `mutation ${inFlightNumber} is in flight: the host re-submits it under the same transaction ID to find out whether it landed, and the resync carries that outcome`,
      }
}

function resyncSuggestion(
  editorName: EditorName,
  editor: EditorSnapshot,
  resync: Applicability,
): Pick<Applicability, 'suggested'> {
  if (!resync.enabled) {
    return {}
  }

  const inFlightNumber = inFlightMutationNumber(editor)

  if (editor.io.sync === 'out of step') {
    return {
      suggested:
        inFlightNumber === undefined
          ? `${editorName} is out of step: resync to recover`
          : `${editorName} is out of step: resync with the outcome of mutation ${inFlightNumber} to recover`,
    }
  }

  if (editor.io.sync === 'blocked' && editor.rejected) {
    return {
      suggested: `${editorName}'s mutation ${editor.rejected.mutationNumber} was rejected: sending is blocked until a resync`,
    }
  }

  return {}
}

/**
 * The world's number for the mutation io has in flight, which io names by
 * its ID.
 */
function inFlightMutationNumber(editor: EditorSnapshot): number | undefined {
  const {inFlight} = editor.io

  return inFlight === undefined
    ? undefined
    : editor.sentMutations.find((mutation) => mutation.id === inFlight.id)
        ?.number
}

function firstCommitApplicability(
  editorName: EditorName,
  editor: EditorSnapshot,
  whyReady: string,
): Applicability {
  if (editor.io.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.io.status !== 'loading') {
    return disabled(whyReady)
  }

  return {
    enabled: true,
    suggested: `${editorName} is in its first commit: load the first content, or end the commit to start empty`,
  }
}

function linkApplicability(
  name: EditorName,
  editor: EditorSnapshot | undefined,
  network: NetworkSnapshot | null,
  deadFeed: boolean,
): LinkApplicability {
  const requests =
    network?.saveRequests.filter((request) => request.editor === name) ?? []
  const replies =
    network?.replies.filter((reply) => reply.editor === name) ?? []
  const lostReplies =
    network?.lostReplies.filter((reply) => reply.editor === name) ?? []
  const feed = network?.feeds[name] ?? []

  const firstRequest = requests.at(0)
  const requestPrompt = firstRequest
    ? `${name}'s ${firstRequest.final ? 'final mutation' : `mutation ${firstRequest.mutationNumber}`} is waiting: the server receives it, or the request fails`
    : undefined

  const firstReply = replies.at(0)
  const replyPrompt = firstReply
    ? `${name}'s mutation ${firstReply.mutationNumber} failed with ${firstReply.status}: deliver the reply`
    : undefined

  const inFlightNumber = editor ? inFlightMutationNumber(editor) : undefined
  const firstRetryable = lostReplies.find(
    (reply) => inFlightNumber === reply.mutationNumber,
  )
  const lostReplyPrompt = firstRetryable
    ? `the save reply for ${name}'s mutation ${firstRetryable.mutationNumber} was lost: retry it with the same transaction ID`
    : undefined

  const held = editor ? heldPrompt(editor, feed) : undefined
  const feedEntries = deadFeed
    ? Object.fromEntries(
        feed.map((item) => [
          item.transactionId,
          disabled(
            `the feed is dead: the network delivers nothing to ${name}'s listener`,
          ),
        ]),
      )
    : feedApplicability(name, editor, feed)
  const suggestedFeed = Object.values(feedEntries).find(
    (entry) => entry.suggested !== undefined,
  )

  return {
    towardServer: {
      prompts: requestPrompt === undefined ? [] : [requestPrompt],
      saveRequests: Object.fromEntries(
        requests.map((request) => [
          request.mutationId,
          request === firstRequest && requestPrompt !== undefined
            ? {enabled: true, suggested: requestPrompt}
            : enabled,
        ]),
      ),
      loseReply: Object.fromEntries(
        requests.map((request) => [
          request.mutationId,
          request.final
            ? disabled('a final mutation gets no reply')
            : {
                enabled: true,
                why: 'the server saves it, but the host never hears back',
              },
        ]),
      ),
    },
    towardEditor: {
      prompts: unique(
        [replyPrompt, lostReplyPrompt, held ?? suggestedFeed?.suggested].filter(
          (prompt) => prompt !== undefined,
        ),
      ),
      replies: Object.fromEntries(
        replies.map((reply) => [
          reply.mutationId,
          reply === firstReply &&
          replyPrompt !== undefined &&
          editor?.io.status !== 'unmounted'
            ? {enabled: true, suggested: replyPrompt}
            : enabled,
        ]),
      ),
      lostReplies: Object.fromEntries(
        lostReplies.map((reply) => [
          reply.mutationId,
          reply === firstRetryable && lostReplyPrompt !== undefined
            ? {enabled: true, suggested: lostReplyPrompt}
            : inFlightNumber === reply.mutationNumber
              ? enabled
              : disabled(
                  `mutation ${reply.mutationNumber} isn't in flight anymore: the host knows what became of it`,
                ),
        ]),
      ),
      feed: feedEntries,
    },
    feedLost: feedLostApplicability(editor),
    held,
  }
}

function feedLostApplicability(
  editor: EditorSnapshot | undefined,
): Applicability {
  if (!editor) {
    return disabled('there are no editors yet')
  }

  if (editor.io.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.io.status === 'loading') {
    return disabled('the feed starts once the editor is ready')
  }

  if (editor.host === 'self-confirming') {
    return disabled('the host has no listener, so there is no feed to lose')
  }

  return editor.io.sync === 'out of step'
    ? disabled('the editor is out of step already: resync')
    : {
        enabled: true,
        why: "the host's listener reconnected or may have missed transactions",
      }
}

/**
 * Suggests the transaction a held one waits for when it is in the feed, and
 * otherwise the first one that can be delivered.
 */
function feedApplicability(
  name: EditorName,
  editor: EditorSnapshot | undefined,
  feed: Array<FeedItem>,
): Record<string, Applicability> {
  const entries = feed.map((_item, index) => {
    if (editor?.io.status === 'loading') {
      return disabled('transactions are only accepted once ready')
    }

    const blockedBy = earlierNamedItem(feed, index)

    return blockedBy === undefined
      ? enabled
      : disabled(`Deliver ${blockedBy} first: the steps name it the same way`)
  })
  const missing = editor ? missingTransaction(editor) : undefined
  const missingIndex =
    missing === undefined
      ? -1
      : feed.findIndex(
          (item, index) =>
            item.resultRev === missing.previousRev && entries[index].enabled,
        )
  const suggestedIndex =
    missingIndex !== -1
      ? missingIndex
      : entries.findIndex((entry) => entry.enabled)

  if (
    editor !== undefined &&
    editor.io.status !== 'unmounted' &&
    suggestedIndex !== -1
  ) {
    const item = feed[suggestedIndex]
    entries[suggestedIndex] = {
      enabled: true,
      suggested:
        missingIndex === -1
          ? `${item.transactionId} is waiting for ${name}: deliver it`
          : `deliver ${item.transactionId}: the held ${missing?.transactionId} connects after it`,
    }
  }

  return Object.fromEntries(
    feed.map((item, index) => [item.transactionId, entries[index]]),
  )
}

function heldPrompt(
  editor: EditorSnapshot,
  feed: Array<FeedItem>,
): string | undefined {
  const missing = missingTransaction(editor)

  if (!missing) {
    return undefined
  }

  const base = describeRev(editor.base.rev)
  const end = describeRev(missing.previousRev)

  return feed.some((item) => item.resultRev === missing.previousRev)
    ? `${missing.transactionId} is held: it doesn't connect to ${base}, deliver the transaction that ends at ${end}, or advance 10 s`
    : `${missing.transactionId} is held: it doesn't connect to ${base}, and no transaction that ends at ${end} is waiting: advance 10 s`
}

/**
 * The held transaction at the start of the held chain: the one no other held
 * transaction leads into.
 */
function missingTransaction(
  editor: EditorSnapshot,
): EditorSnapshot['held'][number] | undefined {
  return editor.held.find(
    (transaction) =>
      !editor.held.some(
        (other) =>
          other !== transaction && other.resultRev === transaction.previousRev,
      ),
  )
}

/**
 * A server change is delivered by name, and the name picks the earliest
 * waiting one, so a later one with the same name can't be delivered first.
 */
function earlierNamedItem(
  feed: Array<FeedItem>,
  index: number,
): string | undefined {
  const item = feed[index]

  if (item.source.type !== 'named') {
    return undefined
  }

  const {name} = item.source
  const earlier = feed
    .slice(0, index)
    .find(
      (candidate) =>
        candidate.source.type === 'named' && candidate.source.name === name,
    )

  return earlier?.transactionId
}

function describeRev(rev: string | null): string {
  return rev ?? 'no document'
}

function disabled(why: string): Applicability {
  return {enabled: false, why}
}

function unique(values: Array<string>): Array<string> {
  return [...new Set(values)]
}
