import {applyAll, type Patch} from '@portabletext/patches'
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
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {
  hasRemoteFrame,
  type ApplyContextFrame,
} from '../engine/core/apply-context'
import {start} from '../engine/editor/start'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Node} from '../engine/interfaces/node'
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
  updateValue({
    context: input.context,
    sendBack,
    editorEngine: input.editorEngine,
    value: input.value,
    streamBlocks: input.streamBlocks,
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
            const {blockChanged, blockValid} = syncBlock({
              context,
              sendBack,
              block: currentBlock,
              index: currentBlockIndex,
              editorEngine,
              value,
              incomingKeys: keyedIncomingKeys,
              remoteSource,
            })

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
      applySelect(editorEngine, start(editorEngine, []))
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

  // Only publish auto resolutions and block renames if the value has been populated before and is different from the last one.
  const publishesRepairs =
    !context.readOnly &&
    context.previousValue !== undefined &&
    context.previousValue !== value
  const autoResolutionPatches =
    publishesRepairs &&
    !validation.valid &&
    validation.resolution?.autoResolve &&
    validation.resolution.patches.length > 0
      ? validation.resolution.patches
      : []

  if (autoResolutionPatches.length > 0) {
    console.warn(
      `${validation.resolution?.action} for block with _key '${block._key}'. ${validation.resolution?.description}`,
    )
  }

  const repairedBlock = applyAutoResolution(validation, validationValue, block)
  const engineBlock = toEngineBlock(repairedBlock, {
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
          debug.syncValue('Inserting new block', repairedBlock)

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
          debug.syncValue('Updating block', replacedBlock, repairedBlock)

          updateBlock({
            context,
            editorEngine,
            oldEngineBlock: replacedBlock,
            block: repairedBlock,
            index,
          })
        } else {
          debug.syncValue('Replacing block', replacedBlock, repairedBlock)

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
      })

      if (!incomingKeys && publishesRepairs) {
        renameRepeatedBlockKey({
          context,
          editorEngine,
          blockKey: block._key,
          index,
          value,
        })
      }
    })
  })

  const syncedBlockKey = incomingKeys
    ? block._key
    : (editorEngine.snapshot.context.value.at(index)?._key ?? block._key)

  for (const patch of autoResolutionPatches) {
    sendBack({
      type: 'patch',
      patch:
        syncedBlockKey === block._key
          ? patch
          : {...patch, path: [{_key: syncedBlockKey}, ...patch.path.slice(1)]},
    })
  }

  return {
    blockChanged: true,
    blockValid: true,
  }
}

/**
 * Give the block just synced at `index` a unique key before normalization
 * sees the repeat. A repeat of an already synced block is renamed with a
 * patch, so the host renames the same block at `index`. An old editor block
 * holding the key is renamed without a patch only if every incoming block up
 * to its index syncs, so the sync is sure to replace it and the host never
 * had it at its position. Otherwise the sync halts before it, and the
 * normalizer renames it with a patch.
 */
function renameRepeatedBlockKey({
  context,
  editorEngine,
  blockKey,
  index,
  value,
}: {
  context: {
    keyGenerator: () => string
    schema: EditorSchema
  }
  editorEngine: PortableTextEditorEngine
  blockKey: string
  index: number
  value: Array<PortableTextBlock>
}) {
  const firstIndexOfKey = editorEngine.snapshot.context.value.findIndex(
    (existingBlock) => existingBlock._key === blockKey,
  )

  if (firstIndexOfKey !== -1 && firstIndexOfKey < index) {
    editorEngine.apply({
      type: 'set',
      path: [index, '_key'],
      value: context.keyGenerator(),
    })
  }

  const oldBlockIndexes = editorEngine.snapshot.context.value.flatMap(
    (existingBlock, existingIndex) =>
      existingIndex > index &&
      existingBlock._key === blockKey &&
      value
        .slice(index + 1, existingIndex + 1)
        .every((incomingBlock) => isSyncable(context.schema, incomingBlock))
        ? [existingIndex]
        : [],
  )

  withoutPatching(editorEngine, () => {
    for (const oldBlockIndex of oldBlockIndexes) {
      editorEngine.apply({
        type: 'set',
        path: [oldBlockIndex, '_key'],
        value: context.keyGenerator(),
      })
    }
  })
}

/**
 * Whether `syncBlock` accepts the block rather than halting the sync on it.
 */
function isSyncable(schema: EditorSchema, block: PortableTextBlock) {
  // The keys minted for a resolution are discarded, so they must not advance
  // the editor's key generator.
  const validation = validateValue([block], schema, () => '')

  return validation.valid || validation.resolution?.autoResolve === true
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

/**
 * `validateValue` auto-resolutions must reach the engine as state, not
 * only the document as patches. Applying them only outbound forks the
 * repair: the document receives the resolution (e.g. a minted child
 * `_key`) while the engine holds the un-repaired shape its addressing
 * model cannot represent, and normalization then mints a different key
 * for the same node. The resolution patches were built from
 * `validationValue` itself, so they always apply; the fallback only
 * covers the impossible empty result.
 */
function applyAutoResolution(
  validation: ReturnType<typeof validateValue>,
  validationValue: Array<PortableTextBlock>,
  block: PortableTextBlock,
): PortableTextBlock {
  return !validation.valid && validation.resolution?.autoResolve
    ? (applyAll(validationValue, validation.resolution.patches).at(0) ?? block)
    : block
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

  // Strip `children`: they're synced by dedicated child operations below.
  const {children: _children, ...blockProps} = engineBlock as unknown as Record<
    string,
    unknown
  >

  applyNodeProperties(editorEngine, blockProps, [{_key: oldEngineBlock._key}])

  // Remove properties present on the old node but absent from the new block.
  // Skip children/text (structural, managed by dedicated operations).
  const oldRecord = oldEngineBlock as unknown as Record<string, unknown>
  const newRecord = engineBlock as unknown as Record<string, unknown>
  const removedProperties: Record<string, unknown> = {}

  for (const key of Object.keys(oldRecord)) {
    if (key === 'children' || key === 'text') {
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
    isTextBlock({schema: editorEngine.snapshot.context.schema}, engineBlock) &&
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

    if (isPureReorder || (newKeys.length > 0 && !hasSharedKeys)) {
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
