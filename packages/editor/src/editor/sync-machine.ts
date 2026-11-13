import {applyAll, set, type Patch} from '@portabletext/patches'
import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {ActorRefFrom} from 'xstate'
import {
  and,
  assertEvent,
  assign,
  emit,
  fromCallback,
  not,
  raise,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {
  withPatching,
  withoutPatching,
} from '../engine-plugins/engine-plugin.without-patching'
import {
  hasRemoteFrame,
  type ApplyContextFrame,
} from '../engine/core/apply-context'
import {
  commitChange,
  createChange,
  resumeChange,
  type Change,
} from '../engine/core/change'
import {start} from '../engine/editor/start'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import {applyNodeProperties} from '../internal-utils/apply-node-properties'
import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
import {debug} from '../internal-utils/debug'
import {deleteRange} from '../internal-utils/delete-range'
import {
  isEqualBlocks,
  isEqualChild,
  isEqualValues,
} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {validateValue} from '../internal-utils/validateValue'
import {toEngineBlock} from '../internal-utils/values'
import {getNode} from '../traversal/get-node'
import {hasNode} from '../traversal/has-node'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {PickFromUnion} from '../type-utils'
import type {InvalidValueResolution} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {KeyedSegment} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorSchema} from './editor-schema'

type SyncValueEvent =
  | {
      type: 'patch'
      patch: Patch
    }
  | {
      type: 'invalid value'
      resolution: InvalidValueResolution | null
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'value changed'
      value: Array<PortableTextBlock> | undefined
    }
  | {
      type: 'done syncing'
      value: Array<PortableTextBlock> | undefined
      changed: boolean
    }

const syncValueCallback: CallbackLogicFunction<
  AnyEventObject,
  SyncValueEvent,
  {
    context: {
      keyGenerator: () => string
      previousValue: Array<PortableTextBlock> | undefined
      readOnly: boolean
      schema: EditorSchema
    }
    editorEngine: PortableTextEditorEngine
    streamBlocks: boolean
    value: Array<PortableTextBlock> | undefined
  }
> = ({sendBack, input}) => {
  // One change for the whole value sync. A streamed first load syncs its
  // blocks across ticks, so the change is resumed for each tick's work and
  // commits once the sync is done.
  const change = createChange({
    type: 'value sync',
    initial: input.streamBlocks,
  })

  resumeChange(input.editorEngine, change, () =>
    updateValue({
      context: input.context,
      sendBack: (event) => {
        // Committed before `done syncing` is announced: that ends the
        // editor's setup, drains the remote patches buffered during the
        // load and starts a pending value's sync, all of which must come
        // after this change's events.
        if (event.type === 'done syncing') {
          commitChange(input.editorEngine, change)
        }

        sendBack(event)
      },
      editorEngine: input.editorEngine,
      change,
      value: input.value,
      streamBlocks: input.streamBlocks,
    }),
  ).finally(() => {
    commitChange(input.editorEngine, change)
  })
}

const syncValueLogic = fromCallback(syncValueCallback)

export type SyncActor = ActorRefFrom<typeof syncMachine>

type RemoteSyncSource = Extract<ApplyContextFrame, {kind: 'remote'}>['source']

/**
 * Sync value with the editor state
 *
 * Normally nothing here should apply, and the editor and the real world are perfectly aligned.
 *
 * Inconsistencies could happen though, so we need to check the editor state when the value changes.
 *
 * For performance reasons, it makes sense to also do the content validation here, as we already
 * iterate over the value and can validate only the new content that is actually changed.
 *
 * @internal
 */
export const syncMachine = setup({
  types: {
    context: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      initialValueSynced: boolean
      keyGenerator: () => string
      schema: EditorSchema
      readOnly: boolean
      editorEngine: PortableTextEditorEngine
      pendingValue: Array<PortableTextBlock> | undefined
      previousValue: Array<PortableTextBlock> | undefined
    },
    input: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      keyGenerator: () => string
      schema: EditorSchema
      readOnly: boolean
      editorEngine: PortableTextEditorEngine
    },
    events: {} as
      | {
          type: 'update value'
          value: Array<PortableTextBlock> | undefined
        }
      | {
          type: 'update readOnly'
          readOnly: boolean
        }
      | SyncValueEvent,
    emitted: {} as
      | PickFromUnion<
          SyncValueEvent,
          'type',
          'invalid value' | 'patch' | 'value changed'
        >
      | {type: 'done syncing value'}
      | {type: 'syncing value'},
  },
  actions: {
    'assign initial value synced': assign({
      initialValueSynced: true,
    }),
    'assign readOnly': assign({
      readOnly: ({event}) => {
        assertEvent(event, 'update readOnly')
        return event.readOnly
      },
    }),
    'assign pending value': assign({
      pendingValue: ({event}) => {
        assertEvent(event, 'update value')
        return event.value
      },
    }),
    'clear pending value': assign({
      pendingValue: undefined,
    }),
    'assign previous value': assign({
      previousValue: ({event}) => {
        assertEvent(event, 'done syncing')
        return event.value
      },
    }),
    'record synced value on engine': ({context, event}) => {
      assertEvent(event, 'done syncing')
      if (event.changed) {
        // A sync that wrote nothing is not a host persistence claim; see
        // `lastSyncedValue`.
        context.editorEngine.lastSyncedValue = event.value
      }
    },
    'emit done syncing value': emit({
      type: 'done syncing value',
    }),
    'emit syncing value': emit({
      type: 'syncing value',
    }),
  },
  guards: {
    'initial value synced': ({context}) => context.initialValueSynced,
    'is busy': ({context}) => {
      const isBusy =
        context.editorEngine.isDeferringMutations ||
        hasRemoteFrame(context.editorEngine.applyContext)

      debug.syncValue(
        safeStringify({
          isBusy,
          isDeferringMutations: context.editorEngine.isDeferringMutations,
          hasRemoteFrame: hasRemoteFrame(context.editorEngine.applyContext),
        }),
      )

      return isBusy
    },
    'is empty value': ({event}) => {
      return event.type === 'update value' && event.value === undefined
    },
    'is empty array': ({event}) => {
      return (
        event.type === 'update value' &&
        Array.isArray(event.value) &&
        event.value.length === 0
      )
    },
    'is new value': ({context, event}) => {
      if (event.type !== 'update value') {
        return false
      }

      if (context.previousValue === event.value) {
        return false
      }

      return !isEqualValues(
        {schema: context.schema},
        context.previousValue,
        event.value,
      )
    },
    'value changed while syncing': ({context, event}) => {
      if (event.type !== 'done syncing') {
        return false
      }

      if (context.pendingValue === event.value) {
        return false
      }

      return !isEqualValues(
        {schema: context.schema},
        context.pendingValue,
        event.value,
      )
    },
  },
  actors: {
    'sync value': syncValueLogic,
  },
}).createMachine({
  id: 'sync',
  context: ({input}) => ({
    initialValue: input.initialValue,
    initialValueSynced: false,
    keyGenerator: input.keyGenerator,
    schema: input.schema,
    readOnly: input.readOnly,
    editorEngine: input.editorEngine,
    pendingValue: undefined,
    previousValue: undefined,
  }),
  entry: [
    raise(({context}) => {
      return {type: 'update value', value: context.initialValue}
    }),
  ],
  on: {
    'update readOnly': {
      actions: ['assign readOnly'],
    },
  },
  initial: 'idle',
  states: {
    idle: {
      entry: [
        () => {
          debug.syncValue('entry: syncing->idle')
        },
      ],
      exit: [
        () => {
          debug.syncValue('exit: syncing->idle')
        },
      ],
      on: {
        'update value': [
          {
            guard: and(['is empty value', not('initial value synced')]),
            actions: ['assign initial value synced', 'emit done syncing value'],
          },
          {
            guard: and(['is empty array', not('initial value synced')]),
            actions: [
              'assign initial value synced',
              emit({type: 'value changed', value: []}),
              'emit done syncing value',
            ],
          },
          {
            guard: and(['is busy', 'is new value']),
            target: 'busy',
            actions: ['assign pending value'],
          },
          {
            guard: 'is new value',
            target: 'syncing',
            actions: ['assign pending value'],
          },
          {
            guard: not('initial value synced'),
            actions: [
              () => {
                debug.syncValue(
                  'no new value – setting initial value as synced',
                )
              },
              'assign initial value synced',
              'emit done syncing value',
            ],
          },
          {
            actions: [
              () => {
                debug.syncValue('no new value and initial value already synced')
              },
            ],
          },
        ],
      },
    },
    busy: {
      entry: [
        () => {
          debug.syncValue('entry: syncing->busy')
        },
      ],
      exit: [
        () => {
          debug.syncValue('exit: syncing->busy')
        },
      ],
      after: {
        1000: [
          {
            guard: 'is busy',
            target: '.',
            reenter: true,
            actions: [
              () => {
                debug.syncValue('reenter: syncing->busy')
              },
            ],
          },
          {
            target: 'syncing',
          },
        ],
      },
      on: {
        'update value': [
          {
            guard: 'is new value',
            actions: ['assign pending value'],
          },
        ],
      },
    },
    syncing: {
      entry: [
        () => {
          debug.syncValue('entry: syncing->syncing')
        },
        'emit syncing value',
      ],
      exit: [
        () => {
          debug.syncValue('exit: syncing->syncing')
        },
        'emit done syncing value',
      ],
      invoke: {
        src: 'sync value',
        id: 'sync value',
        input: ({context}) => {
          return {
            context: {
              keyGenerator: context.keyGenerator,
              previousValue: context.previousValue,
              readOnly: context.readOnly,
              schema: context.schema,
            },
            editorEngine: context.editorEngine,
            streamBlocks: !context.initialValueSynced,
            value: context.pendingValue,
          }
        },
      },
      on: {
        'update value': {
          guard: 'is new value',
          actions: ['assign pending value'],
        },
        'patch': {
          actions: [emit(({event}) => event)],
        },
        'invalid value': {
          actions: [emit(({event}) => event)],
        },
        'value changed': {
          actions: [emit(({event}) => event)],
        },
        'done syncing': [
          {
            guard: 'value changed while syncing',
            actions: [
              'assign previous value',
              'record synced value on engine',
              'assign initial value synced',
            ],
            target: 'syncing',
            reenter: true,
          },
          {
            target: 'idle',
            actions: [
              'clear pending value',
              'assign previous value',
              'record synced value on engine',
              'assign initial value synced',
            ],
          },
        ],
      },
    },
  },
})

async function updateValue({
  context,
  sendBack,
  editorEngine,
  change,
  streamBlocks,
  value,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  sendBack: (event: SyncValueEvent) => void
  editorEngine: PortableTextEditorEngine
  change: Change
  streamBlocks: boolean
  value: PortableTextBlock[] | undefined
}) {
  let isChanged = false
  let isValid = true

  const hadSelection = !!editorEngine.snapshot.context.selection
  // `streamBlocks` is true only for a fresh editor's first value sync
  // (`initialValueSynced` never flips back); an editor created without an
  // initial value never runs that sync, so its first real value is tagged
  // `update-value` instead of `initial-sync`.
  const remoteSource: RemoteSyncSource = streamBlocks
    ? 'initial-sync'
    : 'update-value'

  if (!value || value.length === 0) {
    clearEditor({
      editorEngine,
      remoteSource,
    })

    isChanged = true
  }

  if (value && value.length > 0) {
    const incomingKeys = new Set(value.map((block) => block._key))
    // A key repeated in the incoming value has no single editor block to
    // reconcile against, so such a value falls back to syncing by index.
    const keyedIncomingKeys =
      incomingKeys.size === value.length ? incomingKeys : undefined

    if (streamBlocks) {
      await new Promise<void>((resolve) => {
        isChanged = removeExtraBlocks({
          editorEngine,
          value,
          incomingKeys: keyedIncomingKeys,
          remoteSource,
        })

        const processBlocks = async () => {
          for await (const [
            currentBlock,
            currentBlockIndex,
          ] of getStreamedBlocks({
            value,
          })) {
            const {blockChanged, blockValid} = resumeChange(
              editorEngine,
              change,
              () =>
                syncBlock({
                  context,
                  sendBack,
                  block: currentBlock,
                  index: currentBlockIndex,
                  editorEngine,
                  value,
                  incomingKeys: keyedIncomingKeys,
                  remoteSource,
                }),
            )

            isChanged = blockChanged || isChanged
            isValid = isValid && blockValid

            if (!isValid) {
              break
            }
          }

          resolve()
        }

        processBlocks()
      })
    } else {
      isChanged = removeExtraBlocks({
        editorEngine,
        value,
        incomingKeys: keyedIncomingKeys,
        remoteSource,
      })

      let index = 0

      for (const block of value) {
        const {blockChanged, blockValid} = syncBlock({
          context,
          sendBack,
          block,
          index,
          editorEngine,
          value,
          incomingKeys: keyedIncomingKeys,
          remoteSource,
        })

        isChanged = blockChanged || isChanged
        isValid = isValid && blockValid

        if (!blockValid) {
          break
        }

        index++
      }
    }
  }

  if (!isValid) {
    debug.syncValue('Invalid value, returning')

    sendBack({type: 'done syncing', value, changed: isChanged})

    return
  }

  if (isChanged) {
    debug.syncValue('remote value changed, syncing local value')

    try {
      editorEngine.onChange()
    } catch (err) {
      console.error(err)

      sendBack({
        type: 'invalid value',
        resolution: null,
        value,
      })

      sendBack({type: 'done syncing', value, changed: isChanged})

      return
    }

    if (
      hadSelection &&
      !editorEngine.snapshot.context.selection &&
      editorEngine.snapshot.context.value.length > 0
    ) {
      resumeChange(editorEngine, change, () => {
        applySelect(editorEngine, start(editorEngine, []))
      })
      editorEngine.onChange()
    }

    sendBack({type: 'value changed', value})
  } else {
    debug.syncValue('remote value and local value are equal, no need to sync')
  }

  sendBack({type: 'done syncing', value, changed: isChanged})
}

async function* getStreamedBlocks({value}: {value: Array<PortableTextBlock>}) {
  let index = 0
  for await (const block of value) {
    if (index % 10 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    yield [block, index] as const
    index++
  }
}

/**
 * Unsets every block; normalization then inserts the empty placeholder block.
 */
function clearEditor({
  editorEngine,
  remoteSource,
}: {
  editorEngine: PortableTextEditorEngine
  remoteSource: RemoteSyncSource
}) {
  withRemoteChanges(editorEngine, remoteSource, () => {
    withoutNormalizing(editorEngine, () => {
      pluginWithoutHistory(editorEngine, () => {
        withoutPatching(editorEngine, () => {
          for (
            let index = editorEngine.snapshot.context.value.length - 1;
            index >= 0;
            index--
          ) {
            const removeNode = editorEngine.snapshot.context.value[index]
            if (!removeNode) {
              continue
            }
            editorEngine.apply({
              type: 'unset',
              path: [{_key: removeNode._key}],
            })
          }
        })
      })
    })
  })
}

/**
 * Remove the editor blocks the incoming value no longer holds: those whose
 * key is absent from `incomingKeys`, or, when the value is synced by index,
 * those beyond its length.
 */
function removeExtraBlocks({
  editorEngine,
  value,
  incomingKeys,
  remoteSource,
}: {
  editorEngine: PortableTextEditorEngine
  value: Array<PortableTextBlock>
  incomingKeys: Set<string> | undefined
  remoteSource: RemoteSyncSource
}) {
  const blocks = editorEngine.snapshot.context.value
  const extraBlocks = incomingKeys
    ? blocks.filter((block) => !incomingKeys.has(block._key))
    : blocks.slice(value.length)

  if (extraBlocks.length === blocks.length) {
    // Emptying the editor would make normalization insert a placeholder
    // block with a fresh key. The kept block is replaced by the first
    // incoming block instead.
    extraBlocks.shift()
  }

  if (extraBlocks.length === 0) {
    return false
  }

  withRemoteChanges(editorEngine, remoteSource, () => {
    withoutNormalizing(editorEngine, () => {
      withoutPatching(editorEngine, () => {
        for (const extraBlock of extraBlocks.toReversed()) {
          editorEngine.apply({
            type: 'unset',
            path: [{_key: extraBlock._key}],
          })
        }
      })
    })
  })

  return true
}

function syncBlock({
  context,
  sendBack,
  block,
  index,
  editorEngine,
  value,
  incomingKeys,
  remoteSource,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  sendBack: (event: SyncValueEvent) => void
  block: PortableTextBlock
  index: number
  editorEngine: PortableTextEditorEngine
  value: Array<PortableTextBlock>
  incomingKeys: Set<string> | undefined
  remoteSource: RemoteSyncSource
}) {
  const {blockAtIndex, oldBlock} = findOldBlock({
    snapshot: editorEngine.snapshot,
    blockKey: block._key,
    index,
    incomingKeys,
  })
  const isMoved = oldBlock !== undefined && oldBlock !== blockAtIndex

  if (oldBlock && isEqualBlocks(context, block, oldBlock)) {
    if (isMoved) {
      moveBlock({editorEngine, oldBlock, index, remoteSource})
    }

    return {
      blockChanged: isMoved,
      blockValid: true,
    }
  }

  const validationValue = [block]
  const validation = validateValue(
    validationValue,
    context.schema,
    context.keyGenerator,
  )

  if (!validation.valid && !validation.resolution?.autoResolve) {
    debug.syncValue('Invalid', validation)

    sendBack({
      type: 'invalid value',
      resolution: validation.resolution,
      value,
    })

    return {
      blockChanged: false,
      blockValid: false,
    }
  }

  const sendsResolutionPatches =
    !context.readOnly &&
    context.previousValue !== undefined &&
    context.previousValue !== value

  // Resolve validations that can be resolved automatically, without involving the user (but only if the value was changed)
  if (
    !validation.valid &&
    validation.resolution?.autoResolve &&
    validation.resolution?.patches.length > 0
  ) {
    // Only apply auto resolution if the value has been populated before and is different from the last one.
    if (sendsResolutionPatches) {
      console.warn(
        `${validation.resolution.action} for block with _key '${block._key}'. ${validation.resolution?.description}`,
      )
      validation.resolution.patches.forEach((patch) => {
        sendBack({type: 'patch', patch})
      })
    }
  }

  const autoResolution = splitAutoResolution(
    context,
    validation,
    validationValue,
    block,
    incomingKeys ? {_key: block._key} : index,
    sendsResolutionPatches,
  )
  const engineBlock = toEngineBlock(autoResolution.remoteBlock, {
    schemaTypes: context.schema,
  })
  // In a keyed sync, the block at the index can only lack an incoming key if
  // it is the block `removeExtraBlocks` kept so the editor never empties.
  const replacedBlock =
    oldBlock ??
    (blockAtIndex && !incomingKeys?.has(blockAtIndex._key)
      ? blockAtIndex
      : undefined)

  if (isMoved && oldBlock._type === block._type) {
    moveBlock({editorEngine, oldBlock, index, remoteSource})
  }

  withRemoteChanges(editorEngine, remoteSource, () => {
    withoutNormalizing(editorEngine, () => {
      withoutPatching(editorEngine, () => {
        if (!replacedBlock) {
          debug.syncValue('Inserting new block', autoResolution.remoteBlock)

          editorEngine.apply({
            type: 'insert',
            path: [index],
            node: engineBlock,
            position: 'before',
          })
        } else if (
          replacedBlock._key === block._key &&
          replacedBlock._type === block._type
        ) {
          debug.syncValue(
            'Updating block',
            replacedBlock,
            autoResolution.remoteBlock,
          )

          updateBlock({
            context,
            editorEngine,
            oldEngineBlock: replacedBlock,
            block: autoResolution.remoteBlock,
            index,
          })
        } else {
          debug.syncValue(
            'Replacing block',
            replacedBlock,
            autoResolution.remoteBlock,
          )

          const replace = () =>
            replaceBlock({
              editorEngine,
              oldBlock: replacedBlock,
              engineBlock,
              index,
            })

          if (isMoved) {
            withMovedBlockSelection({
              editorEngine,
              blockKey: replacedBlock._key,
              move: replace,
            })
          } else {
            replace()
          }
        }

        applyRepairs(editorEngine, autoResolution.repairs)
      })
    })
  })

  return {
    blockChanged: true,
    blockValid: true,
  }
}

/**
 * Find the editor block an incoming block reconciles against: the block at
 * `index` when the value is synced by index, otherwise the block with the
 * same key. The keyed lookup goes through `blockIndexMap` so a reorder does
 * not scan the value once per block.
 */
export function findOldBlock({
  snapshot,
  blockKey,
  index,
  incomingKeys,
}: {
  snapshot: TraversalSnapshot
  blockKey: string
  index: number
  incomingKeys: Set<string> | undefined
}) {
  const blockAtIndex = snapshot.context.value.at(index)
  const oldBlock =
    !incomingKeys || blockAtIndex?._key === blockKey
      ? blockAtIndex
      : getNode(snapshot, [{_key: blockKey}])?.node

  return {blockAtIndex, oldBlock}
}

function moveBlock({
  editorEngine,
  oldBlock,
  index,
  remoteSource,
}: {
  editorEngine: PortableTextEditorEngine
  oldBlock: Node
  index: number
  remoteSource: RemoteSyncSource
}) {
  debug.syncValue('Moving block', oldBlock)

  withRemoteChanges(editorEngine, remoteSource, () => {
    withoutNormalizing(editorEngine, () => {
      withoutPatching(editorEngine, () => {
        withMovedBlockSelection({
          editorEngine,
          blockKey: oldBlock._key,
          move: () =>
            replaceBlock({
              editorEngine,
              oldBlock,
              engineBlock: oldBlock,
              index,
            }),
        })
      })
    })
  })
}

function withMovedBlockSelection({
  editorEngine,
  blockKey,
  move,
}: {
  editorEngine: PortableTextEditorEngine
  blockKey: string
  move: () => void
}) {
  const currentSelection = editorEngine.snapshot.context.selection
  const anchorBlockSegment = currentSelection?.anchor.path[0]
  const focusBlockSegment = currentSelection?.focus.path[0]
  const selectionOnBlock =
    currentSelection &&
    ((isKeyedSegment(anchorBlockSegment) &&
      anchorBlockSegment._key === blockKey) ||
      (isKeyedSegment(focusBlockSegment) &&
        focusBlockSegment._key === blockKey))

  if (selectionOnBlock) {
    // `replaceBlock` only restores a selection whose focus is in the
    // block, and the in-place replace path keeps that rule.
    applyDeselect(editorEngine)
  }

  move()

  if (
    selectionOnBlock &&
    hasNode(editorEngine.snapshot, currentSelection.anchor.path) &&
    hasNode(editorEngine.snapshot, currentSelection.focus.path)
  ) {
    applySelect(editorEngine, currentSelection)
  }
}

type Repair = {
  operation: EngineOperation
  patches: Array<Patch>
  /**
   * The patches go out like a normalization fix's, through patch
   * generation, instead of through the sync's own `patch` events.
   */
  asNormalization: boolean
  /**
   * The sync sends the patches as its own `patch` events, which go out
   * once the change is committed.
   */
  sentBySync: boolean
}

/**
 * `validateValue` auto-resolutions must reach the engine as state, not
 * only the document as patches. Applying them only outbound forks the
 * repair: the document receives the resolution (e.g. a minted child
 * `_key`) while the engine holds the un-repaired shape its addressing
 * model cannot represent, and normalization then mints a different key
 * for the same node.
 *
 * The block is split into the part the editor received, applied as
 * remote, and the repairs, applied as their own operations so the
 * `change` reports them as a correction carrying their patches. A keyless
 * child is the one shape the engine cannot hold, so the received part
 * leaves out every keyless child and a repair inserts each with a key.
 * `validateValue` reports only the first; the others keep the keys and
 * the `set` patches normalization gave them, minted last to first and
 * sent as normalization fixes, so the host receives what it always did.
 * The resolution patches were built from `validationValue` itself, so
 * they always apply; the fallback only covers the impossible empty
 * result.
 */
function splitAutoResolution(
  context: {keyGenerator: () => string; schema: EditorSchema},
  validation: ReturnType<typeof validateValue>,
  validationValue: Array<PortableTextBlock>,
  block: PortableTextBlock,
  blockSegment: KeyedSegment | number,
  sendsResolutionPatches: boolean,
): {remoteBlock: PortableTextBlock; repairs: Array<Repair>} {
  const resolution = validation.resolution

  if (validation.valid || !resolution?.autoResolve) {
    return {remoteBlock: block, repairs: []}
  }

  const repairedBlock =
    applyAll(validationValue, resolution.patches).at(0) ?? block

  switch (resolution.i18n.action) {
    case 'inputs.portable-text.invalid-value.missing-child-key.action':
    case 'inputs.portable-text.invalid-value.empty-children.action': {
      const reportedIndex = resolution.i18n.values?.['index'] ?? 0
      const repairedEngineBlock = toEngineBlock(repairedBlock, {
        schemaTypes: context.schema,
      })

      if (
        typeof reportedIndex !== 'number' ||
        !isTextBlock({schema: context.schema}, repairedBlock) ||
        !isTextBlock({schema: context.schema}, repairedEngineBlock) ||
        !repairedEngineBlock.children.at(reportedIndex)
      ) {
        break
      }

      const keylessIndexes = repairedEngineBlock.children.flatMap(
        (child, index) => (child._key === undefined ? [index] : []),
      )
      const mintedKeys = new Map(
        keylessIndexes
          .toReversed()
          .map((index) => [index, context.keyGenerator()]),
      )
      const repairedIndexes = new Set([reportedIndex, ...keylessIndexes])
      const blockPath = [{_key: repairedBlock._key}]

      return {
        remoteBlock: {
          ...repairedBlock,
          children: repairedBlock.children.filter(
            (_child, index) => !repairedIndexes.has(index),
          ),
        },
        repairs: repairedEngineBlock.children.flatMap(
          (child, index): Array<Repair> => {
            if (index === reportedIndex) {
              return [
                {
                  operation: {
                    type: 'insert',
                    path: [blockSegment, 'children', index],
                    node: child,
                    position: 'before',
                  },
                  patches: resolution.patches,
                  asNormalization: false,
                  sentBySync: sendsResolutionPatches,
                },
              ]
            }

            const mintedKey = mintedKeys.get(index)

            if (mintedKey === undefined) {
              return []
            }

            return [
              {
                operation: {
                  type: 'insert',
                  path: [blockSegment, 'children', index],
                  node: {...child, _key: mintedKey},
                  position: 'before',
                },
                patches: [
                  set(mintedKey, [...blockPath, 'children', index, '_key']),
                ],
                asNormalization: true,
                sentBySync: false,
              },
            ]
          },
        ),
      }
    }

    case 'inputs.portable-text.invalid-value.orphaned-mark-defs.action': {
      return {
        remoteBlock: block,
        repairs: resolution.patches.map((patch) => ({
          operation: {
            type: 'unset',
            path: [blockSegment, ...patch.path.slice(1)],
          },
          patches: [patch],
          asNormalization: false,
          sentBySync: sendsResolutionPatches,
        })),
      }
    }
  }

  return {remoteBlock: repairedBlock, repairs: []}
}

/**
 * Applies the repairs in index order, with the received part already in
 * place. A repair sent as a normalization fix applies while patching, in
 * a `normalization` frame, so its patches reach the host when a
 * normalization fix's do. The others leave sending to the sync's `patch`
 * events, and their frame holds the very patches those events carry, or,
 * when the sync sends none (the first load, a read-only editor), the
 * patches the `change` alone delivers.
 */
function applyRepairs(
  editorEngine: PortableTextEditorEngine,
  repairs: Array<Repair>,
) {
  for (const repair of repairs) {
    const frames = [
      ...(repair.asNormalization
        ? [Object.freeze({kind: 'normalization' as const})]
        : []),
      Object.freeze({
        kind: 'repair' as const,
        patches: repair.sentBySync
          ? repair.patches
          : repair.patches.map((patch) => ({
              ...patch,
              origin: 'local' as const,
            })),
        sentAfterChange: repair.sentBySync,
      }),
    ]

    editorEngine.applyContext.push(...frames)

    try {
      if (repair.asNormalization) {
        withPatching(editorEngine, () => {
          editorEngine.apply(repair.operation)
        })
      } else {
        editorEngine.apply(repair.operation)
      }
    } finally {
      editorEngine.applyContext.length -= frames.length
    }
  }
}

function replaceBlock({
  editorEngine,
  oldBlock,
  engineBlock,
  index,
}: {
  editorEngine: PortableTextEditorEngine
  oldBlock: Node
  engineBlock: Node
  index: number
}) {
  // While replacing the block and the current selection focus is on the replaced block,
  // temporarily deselect the editor then optimistically try to restore the selection afterwards.
  const currentSelection = editorEngine.snapshot.context.selection
  const focusBlockSegment = currentSelection?.focus.path[0]
  const selectionFocusOnBlock =
    currentSelection &&
    isKeyedSegment(focusBlockSegment) &&
    focusBlockSegment._key === oldBlock._key

  if (selectionFocusOnBlock) {
    applyDeselect(editorEngine)
  }

  editorEngine.apply({
    type: 'unset',
    path: [{_key: oldBlock._key}],
  })
  editorEngine.apply({
    type: 'insert',
    path: [index],
    node: engineBlock,
    position: 'before',
  })

  editorEngine.onChange()

  if (
    selectionFocusOnBlock &&
    hasNode(editorEngine.snapshot, currentSelection.anchor.path) &&
    hasNode(editorEngine.snapshot, currentSelection.focus.path)
  ) {
    applySelect(editorEngine, currentSelection)
  }
}

function updateBlock({
  context,
  editorEngine,
  oldEngineBlock,
  block,
  index: _index,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  editorEngine: PortableTextEditorEngine
  oldEngineBlock: Node
  block: PortableTextBlock
  index: number
}) {
  const engineBlock = toEngineBlock(block, {
    schemaTypes: context.schema,
  })

  const blockIsTextBlock = isTextBlock({schema: context.schema}, engineBlock)

  // A text block's `children` are synced by the child operations below. Any
  // other block's `children` is an ordinary field.
  const {children: _children, ...propsWithoutChildren} =
    engineBlock as unknown as Record<string, unknown>

  const blockProps = blockIsTextBlock ? propsWithoutChildren : engineBlock

  applyNodeProperties(editorEngine, blockProps, [{_key: oldEngineBlock._key}])

  // Remove properties present on the old node but absent from the new block.
  // Skip `text`, and a text block's `children`, which the child operations
  // below sync.
  const oldRecord = oldEngineBlock as unknown as Record<string, unknown>
  const newRecord = engineBlock as unknown as Record<string, unknown>
  const removedProperties: Record<string, unknown> = {}

  for (const key of Object.keys(oldRecord)) {
    if (key === 'text' || (key === 'children' && blockIsTextBlock)) {
      continue
    }

    if (!newRecord.hasOwnProperty(key)) {
      removedProperties[key] = null
    }
  }

  if (Object.keys(removedProperties).length > 0) {
    applyNodeProperties(editorEngine, removedProperties, [
      {_key: oldEngineBlock._key},
    ])
  }

  // Text block's need to have their children updated as well (setNode does not target a node's children)
  if (
    blockIsTextBlock &&
    isTextBlock({schema: editorEngine.snapshot.context.schema}, oldEngineBlock)
  ) {
    // Detect cases where incremental remove/insert would break due to
    // stale keyed path references. Use a single set to replace the
    // children array atomically instead.
    const oldKeys = oldEngineBlock.children.map((c) => c._key)
    const newKeys = engineBlock.children.map((c) => c._key)
    const oldKeySet = new Set(oldKeys)
    const hasSharedKeys = newKeys.some((key) => oldKeySet.has(key))
    const isPureReorder =
      oldKeys.length === newKeys.length &&
      oldKeys.length > 0 &&
      oldKeySet.size === oldKeys.length &&
      oldKeys.some((key, i) => key !== newKeys[i]) &&
      newKeys.every((key) => oldKeySet.has(key))

    if (isPureReorder || !hasSharedKeys) {
      debug.syncValue('Replacing children via set')
      applyNodeProperties(editorEngine, {children: engineBlock.children}, [
        {_key: oldEngineBlock._key},
      ])
      editorEngine.onChange()
      return
    }

    const oldBlockChildrenLength = oldEngineBlock.children.length

    if (engineBlock.children.length < oldBlockChildrenLength) {
      Array.from(
        Array(oldBlockChildrenLength - engineBlock.children.length),
      ).forEach((_, i) => {
        const childIndex = oldBlockChildrenLength - 1 - i

        if (childIndex > 0) {
          debug.syncValue('Removing child')

          const childNode = oldEngineBlock.children[childIndex]
          if (!childNode) {
            return
          }
          editorEngine.apply({
            type: 'unset',
            path: [
              {_key: oldEngineBlock._key},
              'children',
              {_key: childNode._key},
            ],
          })
        }
      })
    }

    engineBlock.children.forEach(
      (currentBlockChild, currentBlockChildIndex) => {
        const oldBlockChild = oldEngineBlock.children.at(currentBlockChildIndex)
        const isChildChanged =
          !oldBlockChild ||
          !isEqualChild(
            currentBlockChild,
            oldBlockChild,
            editorEngine.snapshot.context.schema.span.name,
          )
        const isTextChanged =
          oldBlockChild &&
          isSpan(
            {schema: editorEngine.snapshot.context.schema},
            oldBlockChild,
          ) &&
          currentBlockChild.text !== oldBlockChild.text
        const path = [
          {_key: oldEngineBlock._key},
          'children',
          {_key: currentBlockChild._key},
        ]

        if (isChildChanged) {
          if (
            currentBlockChild._key === oldBlockChild?._key &&
            currentBlockChild._type === oldBlockChild?._type
          ) {
            debug.syncValue(
              'Updating changed child',
              currentBlockChild,
              oldBlockChild,
            )

            const isSpanNode =
              isSpan({schema: context.schema}, currentBlockChild) &&
              isSpan({schema: context.schema}, oldBlockChild)

            const childProps = {
              ...(currentBlockChild as unknown as Record<string, unknown>),
            }

            // A span's `text` is applied below via text operations. On an
            // inline object `text` is an ordinary field and is written here.
            if (isSpanNode) {
              delete childProps['text']
            }

            applyNodeProperties(editorEngine, childProps, path)

            if (isSpanNode && isTextChanged) {
              if (oldBlockChild.text.length > 0) {
                deleteRange(
                  editorEngine,
                  {
                    focus: {path, offset: 0},
                    anchor: {path, offset: oldBlockChild.text.length},
                  },
                  {
                    selection: 'preserve',
                    removeEmptyStartBlock: true,
                  },
                )
              }

              if (currentBlockChild.text.length > 0) {
                editorEngine.apply({
                  type: 'insert.text',
                  path,
                  offset: 0,
                  text: currentBlockChild.text,
                })
              }

              editorEngine.onChange()
            } else if (!isSpanNode) {
              debug.syncValue(
                'Updating changed inline object child',
                currentBlockChild,
              )
            }
          } else {
            if (oldBlockChild) {
              debug.syncValue('Replacing child', currentBlockChild)

              editorEngine.apply({
                type: 'unset',
                path: [
                  {_key: oldEngineBlock._key},
                  'children',
                  {_key: oldBlockChild._key},
                ],
              })
            } else {
              debug.syncValue('Inserting new child', currentBlockChild)
            }

            // Anchor on the incoming block's previous child, not the
            // pre-loop engine snapshot: earlier iterations may have unset
            // the snapshot's sibling (e.g. when the engine merged adjacent
            // same-mark spans on load and the incoming value still holds
            // the split shape), while the incoming previous child is
            // guaranteed present, the previous iteration just updated,
            // replaced, or inserted it.
            const prevChild =
              currentBlockChildIndex > 0
                ? engineBlock.children[currentBlockChildIndex - 1]
                : undefined
            if (prevChild) {
              editorEngine.apply({
                type: 'insert',
                path: [
                  {_key: oldEngineBlock._key},
                  'children',
                  {_key: prevChild._key},
                ],
                node: currentBlockChild,
                position: 'after',
              })
            } else {
              editorEngine.apply({
                type: 'insert',
                path: [{_key: oldEngineBlock._key}, 'children', 0],
                node: currentBlockChild,
                position: 'before',
              })
            }

            editorEngine.onChange()
          }
        }
      },
    )
  }
}
