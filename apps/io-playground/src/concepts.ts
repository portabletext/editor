export const concepts = [
  {
    name: 'change',
    definition: 'Something a user does, like typing or setting a style.',
  },
  {
    name: 'batch',
    definition:
      'A group of changes an editor sends off to be saved, numbered per editor.',
  },
  {
    name: 'save request',
    definition:
      "A batch on its way from an editor's host to the server, waiting for the server to receive it.",
  },
  {
    name: 'rejection',
    definition:
      'The server refused the batch and the host says so. A save that went well has no reply the editor needs: its transaction coming back is the confirmation.',
  },
  {
    name: 'transaction',
    definition:
      'One entry on the feed: what the server saved in one go, carrying one or more batches or a change made on the server.',
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
      'The one batch the editor has sent and waits to see come back on the feed.',
  },
  {
    name: 'pending',
    definition:
      'Changes made while a batch is in flight, waiting to go out together as the next batch.',
  },
  {
    name: 'confirmed',
    definition:
      "The editor's batch came back on the feed, so the editor knows the batch is on the server and where it sits among everyone's changes.",
  },
  {
    name: 'held',
    definition:
      "A transaction from the feed that doesn't start at the base's revision, kept aside until the missing one before it arrives.",
  },
  {
    name: 'held echo',
    definition:
      "The editor's own batch that came back inside a held transaction, confirmed once that transaction applies.",
  },
  {
    name: 'rejected',
    definition:
      'The server refused the batch and the host said so, and the editor sends nothing more until a resync.',
  },
  {
    name: 'out of step',
    definition:
      'The editor reported that it no longer matches the server and stopped applying the feed until a resync.',
  },
  {
    name: 'resync',
    definition:
      'The host gives the editor a fresh copy of what the server has, and the editor puts its unsent changes back on top. Only when a person asks to load the saved version are the unsent changes thrown away. While a batch is in flight, the host first finds out whether it landed and passes that outcome along: a batch that landed is in the copy, and the changes of one that did not go back with the unsent ones. A rejected batch is dropped, and the editor says so.',
  },
  {
    name: 'sync',
    definition:
      "Whether the user's work is saved: synced when everything came back, saving while a batch is in flight or changes are pending, blocked after a rejection and out of step after an error or a lost feed, both until a resync.",
  },
  {
    name: 'feed lost',
    definition:
      "The host's listener reconnected or may have missed transactions, so it tells the editor, which goes out of step until a resync.",
  },
  {
    name: 'lost reply',
    definition:
      'The server saved the batch but the host never heard back. The host retries with the same transaction ID: the server refuses a transaction ID it already has (a 409) and changes nothing, so the batch lands once.',
  },
  {
    name: 'read-only',
    definition: 'The editor refuses user changes but keeps applying the feed.',
  },
  {
    name: 'error',
    definition:
      "An event the editor emits when it can't trust its copy of the server anymore, which puts it out of step: a transaction is missing, a key collides, a patch can't be applied, its own batch came back rewritten (echo mismatch), or a transaction left content it can't show (invalid content).",
  },
  {
    name: 'work dropped',
    definition:
      "An event the editor emits when it gives up on the user's unsent changes: their target is gone, the editor closed while sending was blocked, or a resync dropped the rejected batch.",
  },
  {
    name: 'warning',
    definition:
      "An event the editor emits when something looks wrong but it can carry on, like a batch that hasn't come back in time.",
  },
] as const

export type ConceptName = (typeof concepts)[number]['name']

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
