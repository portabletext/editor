import type {Patch} from '@portabletext/patches'
import {createActor} from 'xstate'
import {ioMachine, type IoMachineEvent} from './io-machine'
import type {EditorForIo, Io, IoEvent, IoSnapshot, IoStateValue} from './types'
import {isEqual} from './value'

const unsentPatches = new WeakMap<Io, () => Array<Array<Patch>>>()

export function getUnsentPatches(io: Io): Array<Array<Patch>> {
  const read = unsentPatches.get(io)

  if (read === undefined) {
    throw new Error('Not an io made by `createIo`')
  }

  return read()
}

/**
 * Creates io for one editor. io takes the editor's `change`, `ready` and
 * `closed` events at once, and the host's messages through `send`.
 *
 * `keyGenerator` is the editor's key generator.
 *
 * @example
 * ```ts
 * const io = createIo({editor, keyGenerator})
 *
 * io.on('mutation', (mutation) => save(mutation))
 * io.send({type: 'load', value, rev})
 * ```
 *
 * @public
 */
export function createIo(options: {
  editor: EditorForIo
  keyGenerator: () => string
}): Io {
  const {editor} = options
  const actor = createActor(ioMachine)
  const listeners = new Set<(snapshot: IoSnapshot) => void>()
  let snapshot: IoSnapshot | undefined
  let violation: string | undefined

  actor.on('editor message', (event) => {
    editor.send(event.message)
  })
  actor.on('violation', (event) => {
    violation = event.input
  })
  actor.subscribe(() => {
    const next = readSnapshot()

    if (next === snapshot) {
      return
    }

    snapshot = next

    for (const listener of listeners) {
      listener(next)
    }
  })
  actor.start()
  snapshot = readSnapshot()

  editor.on('change', (event) => {
    dispatch({type: 'editor change', patches: event.patches})
  })
  editor.on('ready', () => {
    dispatch({type: 'editor ready'})
  })
  editor.on('closed', () => {
    dispatch({type: 'editor closed'})
  })

  function dispatch(event: IoMachineEvent) {
    violation = undefined
    actor.send(event)

    if (violation === undefined) {
      return
    }

    const message = `io refused \`${violation}\` in its current state`

    if (actor.getSnapshot().matches('closed')) {
      // The editor and the host may still be winding down after close.
      console.error(message)
    } else {
      throw new Error(message)
    }
  }

  function readSnapshot(): IoSnapshot {
    const actorSnapshot = actor.getSnapshot()
    const context = actorSnapshot.context
    const value: IoStateValue = actorSnapshot.matches('loading')
      ? 'loading'
      : actorSnapshot.matches('closed')
        ? 'closed'
        : {
            ready: actorSnapshot.matches({ready: {receive: 'lost'}})
              ? 'out of step'
              : actorSnapshot.matches({ready: {send: 'idle'}})
                ? 'synced'
                : 'saving',
          }
    const publicContext: IoSnapshot['context'] = {
      rev: context.base.rev,
      inFlight:
        context.inFlight === undefined
          ? undefined
          : {
              id: context.inFlight.id,
              transactionId: context.inFlight.transactionId,
            },
      pending: context.pending.length,
      ...(context.outOfStep === undefined
        ? {}
        : {outOfStep: context.outOfStep}),
    }

    if (
      snapshot !== undefined &&
      isEqual(value, snapshot.value) &&
      isEqual(publicContext, snapshot.context)
    ) {
      return snapshot
    }

    return {
      value,
      matches: (state) =>
        typeof state === 'string' && typeof value === 'object'
          ? state === 'ready'
          : isEqual(state, value),
      context: publicContext,
    }
  }

  const io: Io = {
    send: (message) => {
      dispatch(message)
    },
    on: (type, listener) =>
      actor.on(type, (event: IoEvent) => {
        if (event.type === type) {
          listener(event as IoEvent & {type: typeof type})
        }
      }),
    getSnapshot: () => readSnapshot(),
    subscribe: (listener) => {
      listeners.add(listener)

      return {
        unsubscribe: () => {
          listeners.delete(listener)
        },
      }
    },
  }

  unsentPatches.set(io, () => actor.getSnapshot().context.pending)

  return io
}
