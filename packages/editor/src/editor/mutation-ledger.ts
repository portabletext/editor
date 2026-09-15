import type {Patch} from '@portabletext/patches'
import {isDeepEqual} from '../internal-utils/equality'

/**
 * Tracks the patches the editor has emitted through `mutation` events but
 * has not yet seen come back from the host. Hosts wired to a document
 * stream echo every applied patch back into the editor's `patches` event,
 * tagging the editor's own as `origin: 'local'`; each such echo
 * acknowledges one recorded patch. No transaction identity crosses the
 * `mutation` boundary today, so an echo is matched structurally against
 * the earliest recorded patch it equals, ignoring `origin`.
 *
 * The ledger only observes. What the unacknowledged backlog gates
 * (holding pending flushes, dropping superseded repairs) is layered on
 * separately.
 */
export type MutationLedger = {
  /**
   * Record patches the editor just emitted in a `mutation` event, in
   * emission order.
   */
  record: (patches: Array<Patch>) => void
  /**
   * Match an inbound `origin: 'local'` patch against the recorded
   * backlog. Returns `false` for an echo the ledger never recorded (a
   * patch emitted before this editor session, or a host rewriting patch
   * shapes in transit). Hosts echo in application order, so a match also
   * drops every record older than it: their echoes either already came
   * or are never coming, and keeping them would stall the gate on a
   * backlog that predates the echo channel (a host that starts echoing
   * mid-session).
   */
  acknowledge: (patch: Patch) => boolean
  /**
   * The recorded patches no echo has acknowledged yet, in emission order.
   */
  unacknowledged: () => Array<Patch>
}

// A host that never echoes (a snapshot-only integration) never drains the
// backlog, so `record` caps it by dropping the oldest entries. The cap
// only ever bites in that mode: once a host has proven it echoes, the
// batcher keeps at most one batch in flight, and a batch never approaches
// this size. Recording must happen even before the channel is proven,
// since the first echo needs something to match against, but only recent
// emissions can prove it.
const MAX_UNACKNOWLEDGED = 500

export function createMutationLedger(): MutationLedger {
  const inFlight: Array<Patch> = []

  return {
    record: (patches) => {
      inFlight.push(...patches)
      if (inFlight.length > MAX_UNACKNOWLEDGED) {
        inFlight.splice(0, inFlight.length - MAX_UNACKNOWLEDGED)
      }
    },
    acknowledge: (patch) => {
      const index = inFlight.findIndex((candidate) => isEcho(candidate, patch))
      if (index === -1) {
        return false
      }
      inFlight.splice(0, index + 1)
      return true
    },
    unacknowledged: () => inFlight.slice(),
  }
}

function isEcho(emitted: Patch, incoming: Patch): boolean {
  const {origin: emittedOrigin, ...emittedShape} = emitted
  const {origin: incomingOrigin, ...incomingShape} = incoming
  return isDeepEqual(emittedShape, incomingShape)
}
