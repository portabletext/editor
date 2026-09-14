import type {PortableTextBlock} from '@portabletext/editor'
import type {ReconciliationReport} from '@portabletext/markdown'
import {assertEvent, assign, setup} from 'xstate'
import type {RoundTripMismatch} from './round-trip-mismatch'

export type MarkdownLoopPhase = 'authoring' | 'editing' | 'conflict'

/**
 * The Document pane's post-sync badge. `editing`/`conflict`'s own chip
 * (read taken/conflict) is a direct function of the active state and
 * needs no context of its own; this field exists only because "just
 * synced" and "never touched since" are otherwise indistinguishable
 * while both sit in `authoring`.
 */
export type MarkdownLoopChip = 'synced'

export type MarkdownLoopSnapshot = {
  markdown: string
  value: Array<PortableTextBlock>
  /** `markdownToPortableText(portableTextToMarkdown(value)) `, computed once at read time: the evidence `applyMarkdownEdit` itself aligns the edit against. */
  tidied: Array<PortableTextBlock>
  /** The first outline divergence between `value` and `tidied`, or `null` when the two agree. */
  roundTripMismatch: RoundTripMismatch | null
}

/**
 * The evidence a completed sync (`sync succeeded`, including "write
 * anyway") leaves behind for the "how?" dialog to annotate its teaching
 * steps with: the snapshot's stored and tidied copies, the markdown
 * that was synced, and the value that came back. Lives alongside
 * `report` and clears on the same events.
 */
export type MarkdownLoopLastSync = {
  report: ReconciliationReport
  storedValue: Array<PortableTextBlock>
  tidiedValue: Array<PortableTextBlock>
  editedMarkdown: string
  resultValue: Array<PortableTextBlock>
}

export const loopMachine = setup({
  types: {
    context: {} as {
      ready: boolean
      value: Array<PortableTextBlock>
      markdownText: string
      snapshot: MarkdownLoopSnapshot | null
      chip: MarkdownLoopChip | null
      degradationNames: ReadonlyArray<string> | null
      report: ReconciliationReport | null
      lastSync: MarkdownLoopLastSync | null
      invalidValue: boolean
      /** Per-read: a new `read taken` always resets this to `false`. */
      roundTripMismatchDismissed: boolean
    },
    events: {} as
      | {type: 'value ready'; value: Array<PortableTextBlock>}
      | {type: 'mutation'; value: Array<PortableTextBlock>}
      | {
          type: 'read taken'
          markdown: string
          value: Array<PortableTextBlock>
          tidied: Array<PortableTextBlock>
          roundTripMismatch: RoundTripMismatch | null
        }
      | {type: 'markdown edited'; text: string}
      | {
          type: 'sync succeeded'
          value: Array<PortableTextBlock>
          report: ReconciliationReport
        }
      | {type: 'degraded'; names: ReadonlyArray<string>}
      | {type: 'dismiss degradation'}
      | {type: 'dismiss round-trip mismatch'}
      | {type: 'discard'}
      | {type: 'invalid value'}
      | {type: 'reload from editor'; value: Array<PortableTextBlock>},
  },
  actions: {
    'reset for value ready': assign({
      ready: true,
      value: ({event}) => {
        assertEvent(event, 'value ready')
        return event.value
      },
      markdownText: '',
      snapshot: null,
      chip: null,
      degradationNames: null,
      report: null,
      lastSync: null,
      invalidValue: false,
      roundTripMismatchDismissed: false,
    }),
    'update value from mutation': assign({
      value: ({event}) => {
        assertEvent(event, 'mutation')
        return event.value
      },
    }),
    'clear degradation on conflict': assign({
      degradationNames: null,
    }),
    // Fires from `authoring` (the primary "Edit as markdown" button) and
    // from `conflict` (its "Re-read" button): both freeze a new snapshot
    // of the current live value and start a fresh edit.
    'apply read taken': assign({
      value: ({event}) => {
        assertEvent(event, 'read taken')
        return event.value
      },
      markdownText: ({event}) => {
        assertEvent(event, 'read taken')
        return event.markdown
      },
      snapshot: ({event}) => {
        assertEvent(event, 'read taken')
        return {
          markdown: event.markdown,
          value: event.value,
          tidied: event.tidied,
          roundTripMismatch: event.roundTripMismatch,
        }
      },
      chip: null,
      degradationNames: null,
      report: null,
      lastSync: null,
      roundTripMismatchDismissed: false,
    }),
    // Typing is the fix: a rejected-edit card should not survive into
    // the edit that addresses it.
    'apply markdown edited': assign({
      markdownText: ({event}) => {
        assertEvent(event, 'markdown edited')
        return event.text
      },
      degradationNames: null,
    }),
    'apply sync succeeded': assign({
      value: ({event}) => {
        assertEvent(event, 'sync succeeded')
        return event.value
      },
      markdownText: '',
      snapshot: null,
      chip: 'synced',
      degradationNames: null,
      report: ({event}) => {
        assertEvent(event, 'sync succeeded')
        return event.report
      },
      lastSync: ({context, event}) => {
        assertEvent(event, 'sync succeeded')
        return context.snapshot
          ? {
              report: event.report,
              storedValue: context.snapshot.value,
              tidiedValue: context.snapshot.tidied,
              editedMarkdown: context.markdownText,
              resultValue: event.value,
            }
          : context.lastSync
      },
      invalidValue: false,
    }),
    'apply degraded': assign({
      degradationNames: ({event}) => {
        assertEvent(event, 'degraded')
        return event.names
      },
    }),
    'clear degradation': assign({degradationNames: null}),
    'dismiss round-trip mismatch': assign({roundTripMismatchDismissed: true}),
    'apply discard': assign({
      chip: null,
      markdownText: '',
      snapshot: null,
      degradationNames: null,
      report: null,
      lastSync: null,
      invalidValue: false,
    }),
    'flag invalid value': assign({invalidValue: true}),
    // `authoring`'s own answer to a refused synced value: no read to
    // freeze, just adopt whatever the editor is actually holding and
    // clear the flag, staying in `authoring`.
    'reload live value': assign({
      value: ({event}) => {
        assertEvent(event, 'reload from editor')
        return event.value
      },
      invalidValue: false,
    }),
  },
}).createMachine({
  id: 'markdownLoop',
  context: {
    ready: false,
    value: [],
    markdownText: '',
    snapshot: null,
    chip: null,
    degradationNames: null,
    report: null,
    lastSync: null,
    invalidValue: false,
    roundTripMismatchDismissed: false,
  },
  on: {
    'value ready': {target: '.authoring', actions: ['reset for value ready']},
    // Handled in every state: whichever phase the loop is in when the
    // editor refuses a synced value, the flag must still surface.
    'invalid value': {actions: ['flag invalid value']},
  },
  initial: 'authoring',
  states: {
    authoring: {
      on: {
        // The editor's own post-sync validation repair raises a
        // `mutation` right after `apply sync succeeded`; keeping the
        // synced badge, report, and evidence through it is the point,
        // since nothing the user did changed.
        'mutation': {
          actions: ['update value from mutation'],
        },
        'read taken': {target: 'editing', actions: ['apply read taken']},
        'reload from editor': {actions: ['reload live value']},
      },
    },
    editing: {
      on: {
        'mutation': {
          target: 'conflict',
          actions: [
            'update value from mutation',
            'clear degradation on conflict',
          ],
        },
        'markdown edited': {actions: ['apply markdown edited']},
        'sync succeeded': {
          target: 'authoring',
          actions: ['apply sync succeeded'],
        },
        'degraded': {actions: ['apply degraded']},
        'dismiss degradation': {actions: ['clear degradation']},
        'dismiss round-trip mismatch': {
          actions: ['dismiss round-trip mismatch'],
        },
        'discard': {target: 'authoring', actions: ['apply discard']},
      },
    },
    conflict: {
      on: {
        'mutation': {actions: ['update value from mutation']},
        'read taken': {target: 'editing', actions: ['apply read taken']},
        'discard': {target: 'authoring', actions: ['apply discard']},
        'dismiss round-trip mismatch': {
          actions: ['dismiss round-trip mismatch'],
        },
      },
    },
  },
})
