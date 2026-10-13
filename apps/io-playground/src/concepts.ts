import type {HostShape} from '@portabletext/io/testing'

export const concepts = [
  {
    name: 'change',
    definition: 'Something a user does, like typing or setting a style.',
  },
  {
    name: 'mutation',
    definition:
      'A group of changes an editor sends off to be saved, numbered per editor.',
  },
  {
    name: 'save request',
    definition:
      "A mutation on its way from an editor's host to the server, waiting for the server to receive it.",
  },
  {
    name: 'rejection',
    definition:
      'The save request failed for good (a 400, 403 or 404) and the host says so. A failure that may pass (a 500, 503 or a network error) is retried with the same request instead. A save that went well has no reply the editor needs: its transaction coming back is the confirmation.',
  },
  {
    name: 'transaction',
    definition:
      'One entry on the feed: what the server saved in one go, carrying one or more mutations or a change made on the server.',
  },
  {
    name: 'feed',
    definition:
      "The server's list of transactions in order, which every editor receives one at a time.",
  },
  {
    name: 'revision',
    definition:
      "The server's version number for the document, which every transaction moves one step forward.",
  },
  {
    name: 'screen',
    definition:
      'What the editor shows the user right now, its own unconfirmed changes included.',
  },
  {
    name: 'base',
    definition:
      "The editor's copy of what the server has, at the revision of the last transaction it applied.",
  },
  {
    name: 'in flight',
    definition:
      'The one mutation the editor has sent and waits to see come back on the feed.',
  },
  {
    name: 'pending',
    definition:
      'Changes made while a mutation is in flight, waiting to go out together as the next mutation.',
  },
  {
    name: 'confirmed',
    definition:
      "The editor's mutation came back on the feed, so the editor knows the mutation is on the server and where it sits among everyone's changes.",
  },
  {
    name: 'held',
    definition:
      "A transaction from the feed that doesn't start at the base's revision, kept aside until the missing one before it arrives.",
  },
  {
    name: 'held echo',
    definition:
      "The editor's own mutation that came back inside a held transaction, confirmed once that transaction applies.",
  },
  {
    name: 'rejected',
    definition:
      'The server refused the mutation and the host said so, and the editor sends nothing more until a resync.',
  },
  {
    name: 'out of step',
    definition:
      "The editor reported that it no longer matches the server, and it stops applying the feed and sending mutations until a resync. It keeps taking the user's changes and recognizing its own mutations when they come back.",
  },
  {
    name: 'resync',
    definition:
      'The host gives the editor a fresh copy of what the server has, and the editor puts its unsent changes back on top. Only when a person asks to load the saved version are the unsent changes thrown away. While a mutation is in flight, the host first finds out whether it landed and passes that outcome along: a mutation that landed is in the copy, and the changes of one that did not go back with the unsent ones. A rejected mutation is dropped, and the editor says so.',
  },
  {
    name: 'sync',
    definition:
      "Whether the user's work is saved: synced when everything came back, saving while a mutation is in flight or changes are pending, blocked after a rejection and out of step after an error or a lost feed, both until a resync.",
  },
  {
    name: 'feed lost',
    definition:
      "The host's listener reconnected or may have missed transactions, so it tells the editor, which goes out of step until a resync.",
  },
  {
    name: 'lost reply',
    definition:
      'The server saved the mutation but the host never heard back. The host retries with the same transaction ID: the server refuses a transaction ID it already has (a 409) and changes nothing, so the mutation lands once.',
  },
  {
    name: 'read-only',
    definition: 'The editor refuses user changes but keeps applying the feed.',
  },
  {
    name: 'error',
    definition:
      "An event the editor emits when it can't trust its copy of the server anymore, which puts it out of step: a transaction is missing, a key collides, a patch can't be applied, its own mutation came back rewritten (echo mismatch), or a transaction left content it can't show (invalid content).",
  },
  {
    name: 'work dropped',
    definition:
      "An event the editor emits when it gives up on the user's unsent changes: their target is gone, the editor closed while sending was blocked or while it was out of step, or a resync dropped the rejected mutation.",
  },
  {
    name: 'transaction.value',
    definition:
      "The field as the server holds it right after a transaction, from the listener's result. When the listener sends it, the host passes it on and io takes it as the new base instead of applying the patches to the old one. The patches still travel: io checks them, authors `apply` from them for the editor's tree, and matches them against its mutation to confirm it.",
  },
  {
    name: 'first commit',
    definition:
      'The editor mounting, before it is ready. It takes its first content as a `load` now, and a second `load` replaces the first. Ending the first commit makes it ready, with the content loaded or empty. After ready a `load` throws, and a `resync` takes over.',
  },
  {
    name: 'message path',
    definition:
      "Every message between an editor's host and io, in the order it passed, and what io sent the editor: `mutation` goes out to the host, `mutation sent`, `mutation rejected`, `transaction`, `feed lost`, `load` and `resync` come in from it, and `load`, `resync` and `apply` reach the editor's tree.",
  },
  {
    name: 'host',
    definition:
      'The application around the editor that talks to the server: it saves the mutations io emits, forwards the transactions the server records, and hands over the server copy. Free play offers three shapes.',
  },
  {
    name: 'warning',
    definition:
      "An event the editor emits when something looks wrong but it can carry on, like a mutation that hasn't come back in time.",
  },
] as const

export type ConceptName = (typeof concepts)[number]['name']

/**
 * The host shapes the world supports, under the names of the hosts they
 * stand in for.
 */
export const hostPresets = [
  {
    shape: 'plain',
    label: 'plain host',
    step: null,
    description:
      'Saves each mutation as its own request, under the transaction ID io proposed with it, so it never sends `mutation sent`. Its listener forwards every transaction the server records, its own included, and its own transaction coming back confirms the mutation. The shape a simple app or the SDK plugin takes.',
  },
  {
    shape: 'folding',
    label: 'Studio-shaped host',
    step: 'hosts that fold mutations into shared requests',
    description:
      "Folds the mutations waiting at a flush into one request, the way Studio's committer sends the whole form in one commit. The request gets the host's own transaction ID, and the host tells io which with a `mutation sent` for each mutation in it, so the transaction coming back on the listener still confirms the right mutations. The request is frozen once formed: a retry or a re-submit sends it as it was, under the same ID.",
  },
  {
    shape: 'self-confirming',
    label: 'Horizon-shaped host',
    step: 'hosts that confirm each mutation themselves',
    description:
      "Has no listener and is the document's only writer. The answer to each save carries the transaction it became, and the host forwards that as `transaction` itself, which confirms the mutation. No other writer's changes reach it, and there is no feed to lose.",
  },
] as const satisfies ReadonlyArray<{
  shape: HostShape
  label: string
  step: string | null
  description: string
}>

export function hostPresetOf(shape: HostShape) {
  return hostPresets.find((preset) => preset.shape === shape) ?? hostPresets[0]
}

export function definitionOf(name: ConceptName): string {
  return concepts.find((concept) => concept.name === name)?.definition ?? ''
}

export function revisionTitle(rev: string | null): string {
  return rev === null
    ? "no revision: the document doesn't exist on the server"
    : `revision ${rev}, the server's version number for the document`
}

export const notationRules = [
  {
    notation: 'B: foo',
    meaning: 'A normal text block. `H1: foo` is a heading.',
  },
  {notation: 'B: |', meaning: 'One empty block.'},
  {
    notation: '|',
    meaning:
      'The caret. A check that writes one compares the selection, and the server never has one.',
  },
  {
    notation: ';;',
    meaning: 'Separates blocks in single-line form, as in `B: foo|;;B: bar`.',
  },
  {
    notation: '_key',
    meaning:
      'Names a block\'s key, as in `B _key="k9": baz`. A check compares keys only when it names them.',
  },
  {
    notation: '\\|',
    meaning: 'How the caret is written inside a Gherkin Examples table.',
  },
]

export const floorRules = [
  {
    phrase: 'has no key',
    label: 'remove its key',
    shape: 'A block without `_key`.',
    onCopy:
      'io gives it a repair key, hashed from the revision and the index path, so two editors repairing the same copy agree, and the repair goes out in the next mutation.',
  },
  {
    phrase: 'has no type',
    label: 'remove its type',
    shape: 'A block without `_type`.',
    onCopy:
      "io makes it `'block'` (a text block's child becomes `'span'`), and the repair goes out in the next mutation.",
  },
  {
    phrase: 'has children "oops"',
    label: 'set its children to "oops"',
    shape: "A text block whose `children` isn't a non-empty array of objects.",
    onCopy:
      'io gives it one empty span with a repair key, and the repair goes out in the next mutation.',
  },
  {
    phrase: 'has a span whose text is 42',
    label: "set a span's text to 42",
    shape: "A span whose `text` isn't a string.",
    onCopy:
      "io sets the text to `''`, and the repair goes out in the next mutation.",
  },
  {
    phrase: 'is the string "oops"',
    label: 'replace it with "oops"',
    shape: "A block that isn't an object.",
    onCopy:
      'io leaves it out of what the editor gets and never writes to it, so the server keeps it. A repair of a later block addresses it by its index in the stored array.',
  },
] as const

export const floorOnTransaction =
  'A transaction that leaves any of these in the blocks it changed makes io emit `error` with reason `invalid content`. The editor is out of step until a resync, which repairs the copy as above.'
