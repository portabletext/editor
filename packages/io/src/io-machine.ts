import type {Patch} from '@portabletext/patches'
import {enqueueActions, not, setup, stateIn} from 'xstate'
import {
  createContext,
  handOver,
  load,
  nameTransaction,
  outOfStep,
  queueChange,
  receiveTransaction,
  reject,
  resync,
  sendPending,
  takeHeld,
  type IoContext,
  type IoEmitted,
  type Outcome,
} from './protocol'
import type {IoMessage} from './types'

export const quietWait = 1_000
export const maxDebounceWait = 5_000
export const gapWait = 1_000

export type IoMachineEvent =
  | IoMessage
  | {type: 'editor change'; patches: Array<Patch>}
  | {type: 'editor ready'}
  | {type: 'editor closed'}

export const ioMachine = setup({
  types: {
    context: {} as IoContext,
    events: {} as IoMachineEvent,
    emitted: {} as IoEmitted,
  },
  actions: {
    'violation': enqueueActions(({event, enqueue}) => {
      enqueue.emit({type: 'violation', input: event.type})
    }),
    'load': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'load') {
        commit(enqueue, load(context, event))
      }
    }),
    'hold': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'transaction') {
        enqueue.assign({held: [...context.held, event]})
      }
    }),
    'take held on ready': enqueueActions(({context, enqueue}) => {
      commit(enqueue, takeHeld(context, {onReady: true}))
    }),
    'receive transaction': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'transaction') {
        commit(enqueue, receiveTransaction(context, event))
      }
    }),
    'lose feed': enqueueActions(({context, enqueue}) => {
      commit(enqueue, outOfStep(context, 'feed lost'))
    }),
    'give up on gap': enqueueActions(({context, enqueue}) => {
      commit(enqueue, outOfStep(context, 'gap'))
    }),
    'queue change': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'editor change') {
        commit(enqueue, queueChange(context, event.patches))
      }
    }),
    'send pending': enqueueActions(({context, enqueue}) => {
      commit(enqueue, sendPending(context))
    }),
    'name transaction': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'mutation sent') {
        commit(enqueue, nameTransaction(context, event))
      }
    }),
    'reject': enqueueActions(({context, event, enqueue}) => {
      if (
        event.type === 'mutation rejected' &&
        context.inFlight?.id === event.id
      ) {
        commit(enqueue, reject(context))
      }
    }),
    'resync': enqueueActions(({context, event, enqueue}) => {
      if (event.type === 'resync') {
        commit(enqueue, resync(context, event))
      }
    }),
    'hand over': enqueueActions(({context, enqueue}) => {
      commit(enqueue, handOver(context))
    }),
  },
  guards: {
    'is loaded': ({context}) => context.loaded,
    'has pending': ({context}) => context.pending.length > 0,
    'has held': ({context}) => context.held.length > 0,
    'has nothing in flight': ({context}) => context.inFlight === undefined,
    'is out of step': ({context}) => context.outOfStep !== undefined,
    'is following': stateIn({ready: {receive: 'following'}}),
    'is resync without outcome': ({context, event}) =>
      event.type === 'resync' &&
      context.inFlight !== undefined &&
      event.outcomes?.[context.inFlight.id] === undefined,
  },
  delays: {
    quiet: quietWait,
    max: maxDebounceWait,
    gap: gapWait,
  },
}).createMachine({
  id: 'io',
  context: () => createContext(),
  initial: 'loading',
  states: {
    loading: {
      on: {
        'load': {actions: 'load'},
        'transaction': {actions: 'hold'},
        'feed lost': {actions: 'lose feed'},
        'editor ready': [
          {guard: 'is loaded', target: 'ready', actions: 'take held on ready'},
          {actions: 'violation'},
        ],
        'close': {target: 'closed'},
        'editor closed': {target: 'closed'},
        'resync': {actions: 'violation'},
        'editor change': {actions: 'violation'},
      },
    },
    ready: {
      type: 'parallel',
      on: {
        'load': {actions: 'violation'},
        'editor ready': {actions: 'violation'},
        'resync': [
          {guard: 'is resync without outcome', actions: 'violation'},
          {target: '#io.ready', reenter: true, actions: 'resync'},
        ],
        'close': {target: 'closed', actions: 'hand over'},
        'editor closed': {target: 'closed', actions: 'hand over'},
      },
      states: {
        send: {
          initial: 'idle',
          states: {
            idle: {
              always: {guard: 'has pending', target: 'flush'},
              on: {
                'editor change': {
                  target: 'debouncing',
                  actions: 'queue change',
                },
              },
            },
            debouncing: {
              initial: 'quiet',
              after: {max: 'flush'},
              on: {
                'editor change': {actions: 'queue change'},
              },
              states: {
                quiet: {
                  after: {quiet: '#io.ready.send.flush'},
                  on: {
                    'editor change': {
                      target: 'quiet',
                      reenter: true,
                      actions: 'queue change',
                    },
                  },
                },
              },
            },
            flush: {
              always: [
                {guard: not('has pending'), target: 'idle'},
                {
                  guard: 'is following',
                  target: 'sending',
                  actions: 'send pending',
                },
              ],
              on: {
                'editor change': {actions: 'queue change'},
              },
            },
            sending: {
              always: {guard: 'has nothing in flight', target: 'idle'},
              on: {
                'editor change': {actions: 'queue change'},
                'mutation sent': {actions: 'name transaction'},
                'mutation rejected': {actions: 'reject'},
              },
            },
          },
        },
        receive: {
          initial: 'following',
          states: {
            following: {
              always: [
                {guard: 'is out of step', target: 'lost'},
                {guard: 'has held', target: 'gap'},
              ],
              on: {
                'transaction': {actions: 'receive transaction'},
                'feed lost': {actions: 'lose feed'},
              },
            },
            gap: {
              always: [
                {guard: 'is out of step', target: 'lost'},
                {guard: not('has held'), target: 'following'},
              ],
              after: {gap: {actions: 'give up on gap'}},
              on: {
                'transaction': {actions: 'receive transaction'},
                'feed lost': {actions: 'lose feed'},
              },
            },
            lost: {},
          },
        },
      },
    },
    closed: {
      on: {
        'load': {actions: 'violation'},
        'resync': {actions: 'violation'},
        'editor ready': {actions: 'violation'},
        'editor change': {actions: 'violation'},
      },
    },
  },
})

function commit(
  enqueue: {
    assign: (context: IoContext) => void
    emit: (event: IoEmitted) => void
  },
  outcome: Outcome,
) {
  enqueue.assign(outcome.context)

  for (const event of outcome.emitted) {
    enqueue.emit(event)
  }
}
