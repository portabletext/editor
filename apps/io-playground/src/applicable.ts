import type {
  EditorName,
  EditorSnapshot,
  NetworkSnapshot,
  WorldSnapshot,
} from '@portabletext/io'

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
  | 'release claim'

export type EditorApplicability = Record<EditorAction, Applicability>

export type LinkApplicability = {
  towardServer: {
    prompts: Array<string>
    /** By batch ID. */
    saveRequests: Record<string, Applicability>
    /** Receiving a save request and losing its reply, by batch ID. */
    loseReply: Record<string, Applicability>
  }
  towardEditor: {
    prompts: Array<string>
    /** By batch ID. */
    replies: Record<string, Applicability>
    /** Retrying the save whose reply was lost, by batch ID. */
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
      'release claim': noEditor,
    }
  }

  const edit = editApplicability(editor)
  const resync = resyncApplicability(editor)

  return {
    'type': edit,
    'set style': edit,
    'put caret after':
      editor.status === 'unmounted' ? disabled(whyUnmounted) : enabled,
    'insert block': edit,
    'delete block': edit,
    'delete before caret': edit,
    'undo':
      edit.enabled && editor.undoDepth === 0
        ? disabled('there is nothing to undo')
        : edit,
    'read-only':
      editor.status === 'unmounted'
        ? disabled(whyUnmounted)
        : editor.readOnly
          ? disabled('the steps have no way to end read-only')
          : enabled,
    'close': editor.status === 'unmounted' ? disabled(whyUnmounted) : enabled,
    'resync': {...resync, ...resyncSuggestion(editorName, editor, resync)},
    'resync discarding': !resync.enabled
      ? resync
      : editor.inFlight
        ? disabled('the steps discard only when no batch is in flight')
        : editor.pending.length === 0
          ? disabled('nothing unsent to discard')
          : {
              enabled: true,
              why: `the user's choice: load the saved version and throw away ${editor.pending.length} unsent change(s)`,
            },
    'load':
      editor.status === 'unmounted'
        ? disabled(whyUnmounted)
        : editor.status === 'loading'
          ? {enabled: true, suggested: loadPrompt(editorName)}
          : disabled('load is only accepted while the first load is claimed'),
    'release claim': releaseClaimApplicability(editorName, editor),
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

export function applicableNetworkActions(
  snapshot: WorldSnapshot,
): NetworkApplicability {
  const link = (name: EditorName) =>
    linkApplicability(name, snapshot.editors?.[name], snapshot.network)
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
  if (editor.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.status === 'loading') {
    return disabled(whyLoading)
  }

  return editor.readOnly ? disabled(whyReadOnly) : enabled
}

function resyncApplicability(editor: EditorSnapshot): Applicability {
  if (editor.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.status === 'loading') {
    return disabled('resync is only accepted once ready')
  }

  return editor.inFlight
    ? {
        enabled: true,
        why: `batch ${editor.inFlight.batchNumber} is in flight: the host looks up in the transaction history whether it landed, and the resync carries that outcome`,
      }
    : enabled
}

function resyncSuggestion(
  editorName: EditorName,
  editor: EditorSnapshot,
  resync: Applicability,
): Pick<Applicability, 'suggested'> {
  if (!resync.enabled) {
    return {}
  }

  if (editor.outOfStep) {
    return {
      suggested: editor.inFlight
        ? `${editorName} is out of step: resync with the outcome of batch ${editor.inFlight.batchNumber} to recover`
        : `${editorName} is out of step: resync to recover`,
    }
  }

  if (editor.rejected) {
    return {
      suggested: `${editorName}'s batch ${editor.rejected.batchNumber} was rejected: sending is blocked until a resync`,
    }
  }

  return {}
}

function releaseClaimApplicability(
  editorName: EditorName,
  editor: EditorSnapshot,
): Applicability {
  if (editor.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.status !== 'loading') {
    return disabled('no claim is pending')
  }

  if (editorName !== 'Editor A') {
    return disabled("the steps release Editor A's claim only")
  }

  return {enabled: true, suggested: loadPrompt(editorName)}
}

function loadPrompt(editorName: EditorName): string {
  return editorName === 'Editor A'
    ? `${editorName}'s first load is claimed: load the first content, or release the claim`
    : `${editorName}'s first load is claimed: load the first content`
}

function linkApplicability(
  name: EditorName,
  editor: EditorSnapshot | undefined,
  network: NetworkSnapshot | null,
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
    ? `${name}'s ${firstRequest.final ? 'final batch' : `batch ${firstRequest.batchNumber}`} is waiting: the server receives it, or refuses it`
    : undefined

  const firstReply = replies.at(0)
  const replyPrompt = firstReply
    ? `${name}'s batch ${firstReply.batchNumber} was refused: deliver the rejection`
    : undefined

  const firstRetryable = lostReplies.find(
    (reply) => editor?.inFlight?.batchNumber === reply.batchNumber,
  )
  const lostReplyPrompt = firstRetryable
    ? `the save reply for ${name}'s batch ${firstRetryable.batchNumber} was lost: retry it with the same transaction ID`
    : undefined

  const held = editor ? heldPrompt(editor, feed) : undefined
  const feedEntries = feedApplicability(name, editor, feed)
  const suggestedFeed = Object.values(feedEntries).find(
    (entry) => entry.suggested !== undefined,
  )

  return {
    towardServer: {
      prompts: requestPrompt === undefined ? [] : [requestPrompt],
      saveRequests: Object.fromEntries(
        requests.map((request) => [
          request.batchId,
          request === firstRequest && requestPrompt !== undefined
            ? {enabled: true, suggested: requestPrompt}
            : enabled,
        ]),
      ),
      loseReply: Object.fromEntries(
        requests.map((request) => [
          request.batchId,
          request.final
            ? disabled('a final batch gets no reply')
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
          reply.batchId,
          reply === firstReply &&
          replyPrompt !== undefined &&
          editor?.status !== 'unmounted'
            ? {enabled: true, suggested: replyPrompt}
            : enabled,
        ]),
      ),
      lostReplies: Object.fromEntries(
        lostReplies.map((reply) => [
          reply.batchId,
          reply === firstRetryable && lostReplyPrompt !== undefined
            ? {enabled: true, suggested: lostReplyPrompt}
            : editor?.inFlight?.batchNumber === reply.batchNumber
              ? enabled
              : disabled(
                  `batch ${reply.batchNumber} isn't in flight anymore: the host knows what became of it`,
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

  if (editor.status === 'unmounted') {
    return disabled(whyUnmounted)
  }

  if (editor.status === 'loading') {
    return disabled('the feed starts once the editor is ready')
  }

  return editor.outOfStep
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
    if (editor?.status === 'loading') {
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
    editor.status !== 'unmounted' &&
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
