import type {Patch} from '@portabletext/patches'
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
import {start} from '../engine/editor/start'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Node} from '../engine/interfaces/node'
import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
import {debug} from '../internal-utils/debug'
import {deleteRange} from '../internal-utils/delete-range'
import {
  isEqualBlocks,
  isEqualChild,
  isEqualValues,
} from '../internal-utils/equality'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {validateValue} from '../internal-utils/validateValue'
import {toEngineBlock} from '../internal-utils/values'
import {hasNode} from '../traversal/has-node'
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
        context.editorEngine.isProcessingRemoteChanges

      debug.syncValue(
        safeStringify({
          isBusy,
          isDeferringMutations: context.editorEngine.isDeferringMutations,
          isProcessingRemoteChanges:
            context.editorEngine.isProcessingRemoteChanges,
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
    'pending value equals previous value': ({context}) => {
      return isEqualValues(
        {schema: context.schema},
        context.pendingValue,
        context.previousValue,
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
            actions: ['assign previous value', 'assign initial value synced'],
            target: 'syncing',
            reenter: true,
          },
          {
            target: 'idle',
            actions: [
              'clear pending value',
              'assign previous value',
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
  let doneSyncing = false
  let isChanged = false
  let isValid = true

  const hadSelection = !!editorEngine.snapshot.context.selection

  if (!value || value.length === 0) {
    clearEditor({
      editorEngine,
      doneSyncing,
    })

    isChanged = true
  }

  // Remove, replace or add nodes according to what is changed.
  if (value && value.length > 0) {
    if (streamBlocks) {
      await new Promise<void>((resolve) => {
        if (doneSyncing) {
          resolve()
          return
        }

        isChanged = removeExtraBlocks({
          editorEngine,
          value,
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
      if (doneSyncing) {
        return
      }

      isChanged = removeExtraBlocks({
        editorEngine,
        value,
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

    doneSyncing = true

    sendBack({type: 'done syncing', value})

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

      doneSyncing = true

      sendBack({type: 'done syncing', value})

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

  doneSyncing = true

  sendBack({type: 'done syncing', value})
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
 * Remove all blocks and insert a placeholder block
 */
function clearEditor({
  editorEngine,
  doneSyncing,
}: {
  editorEngine: PortableTextEditorEngine
  doneSyncing: boolean
}) {
  withoutNormalizing(editorEngine, () => {
    pluginWithoutHistory(editorEngine, () => {
      withRemoteChanges(editorEngine, () => {
        withoutPatching(editorEngine, () => {
          if (doneSyncing) {
            return
          }

          const childrenLength = editorEngine.snapshot.context.value.length

          editorEngine.snapshot.context.value.forEach((_, index) => {
            const removeNode =
              editorEngine.snapshot.context.value[childrenLength - 1 - index]
            if (!removeNode) {
              return
            }
            editorEngine.apply({
              type: 'unset',
              path: [{_key: removeNode._key}],
            })
          })
        })
      })
    })
  })
}

/**
 * Compare the length of the value and the length of the editor's children, and
 * remove blocks that have become superfluous
 */
function removeExtraBlocks({
  editorEngine,
  value,
}: {
  editorEngine: PortableTextEditorEngine
  value: Array<PortableTextBlock>
}) {
  let isChanged = false

  withoutNormalizing(editorEngine, () => {
    withRemoteChanges(editorEngine, () => {
      withoutPatching(editorEngine, () => {
        const childrenLength = editorEngine.snapshot.context.value.length

        if (value.length < childrenLength) {
          for (let i = childrenLength - 1; i > value.length - 1; i--) {
            const removeNode = editorEngine.snapshot.context.value[i]
            if (!removeNode) {
              continue
            }
            editorEngine.apply({
              type: 'unset',
              path: [{_key: removeNode._key}],
            })
          }

          isChanged = true
        }
      })
    })
  })

  return isChanged
}

function syncBlock({
  context,
  sendBack,
  block,
  index,
  editorEngine,
  value,
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
}) {
  const oldEngineBlock = editorEngine.snapshot.context.value.at(index)
  const oldBlock = editorEngine.snapshot.context.value.at(index)

  if (!oldEngineBlock || !oldBlock) {
    // Insert the new block
    const validation = validateValue(
      [block],
      context.schema,
      context.keyGenerator,
    )

    debug.syncValue(
      'Validating and inserting new block in the end of the value',
      block,
    )

    if (validation.valid || validation.resolution?.autoResolve) {
      const engineBlock = toEngineBlock(block, {
        schemaTypes: context.schema,
      })

      withoutNormalizing(editorEngine, () => {
        withRemoteChanges(editorEngine, () => {
          withoutPatching(editorEngine, () => {
            editorEngine.apply({
              type: 'insert',
              path: [editorEngine.snapshot.context.value.length],
              node: engineBlock,
              position: 'before',
            })
          })
        })
      })

      return {
        blockChanged: true,
        blockValid: true,
      }
    }

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

  if (isEqualBlocks(context, block, oldBlock)) {
    // Nothing to sync, skipping the block
    return {
      blockChanged: false,
      blockValid: true,
    }
  }

  const blockToValidate = value[index]
  if (!blockToValidate) {
    return {
      blockChanged: false,
      blockValid: true,
    }
  }
  const validationValue = [blockToValidate]
  const validation = validateValue(
    validationValue,
    context.schema,
    context.keyGenerator,
  )

  // Resolve validations that can be resolved automatically, without involving the user (but only if the value was changed)
  if (
    !validation.valid &&
    validation.resolution?.autoResolve &&
    validation.resolution?.patches.length > 0
  ) {
    // Only apply auto resolution if the value has been populated before and is different from the last one.
    if (
      !context.readOnly &&
      context.previousValue &&
      context.previousValue !== value
    ) {
      // Give a console warning about the fact that it did an auto resolution
      console.warn(
        `${validation.resolution.action} for block with _key '${blockToValidate._key}'. ${validation.resolution?.description}`,
      )
      validation.resolution.patches.forEach((patch) => {
        sendBack({type: 'patch', patch})
      })
    }
  }

  if (validation.valid || validation.resolution?.autoResolve) {
    if (oldBlock._key === block._key && oldBlock._type === block._type) {
      debug.syncValue('Updating block', oldBlock, block)

      withoutNormalizing(editorEngine, () => {
        withRemoteChanges(editorEngine, () => {
          withoutPatching(editorEngine, () => {
            updateBlock({
              context,
              editorEngine,
              oldEngineBlock,
              block,
              index,
            })
          })
        })
      })
    } else {
      debug.syncValue('Replacing block', oldBlock, block)

      withoutNormalizing(editorEngine, () => {
        withRemoteChanges(editorEngine, () => {
          withoutPatching(editorEngine, () => {
            replaceBlock({
              context,
              editorEngine,
              block,
              index,
            })
          })
        })
      })
    }

    return {
      blockChanged: true,
      blockValid: true,
    }
  } else {
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
}

function replaceBlock({
  context,
  editorEngine,
  block,
  index,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  editorEngine: PortableTextEditorEngine
  block: PortableTextBlock
  index: number
}) {
  const engineBlock = toEngineBlock(block, {
    schemaTypes: context.schema,
  })

  // While replacing the block and the current selection focus is on the replaced block,
  // temporarily deselect the editor then optimistically try to restore the selection afterwards.
  const currentSelection = editorEngine.snapshot.context.selection
  const focusBlockSegment = currentSelection?.focus.path[0]
  const blockAtIndex = editorEngine.snapshot.context.value[index]
  const selectionFocusOnBlock =
    currentSelection &&
    isKeyedSegment(focusBlockSegment) &&
    blockAtIndex &&
    focusBlockSegment._key === blockAtIndex._key

  if (selectionFocusOnBlock) {
    applyDeselect(editorEngine)
  }

  const oldNode = editorEngine.snapshot.context.value[index]
  if (!oldNode) {
    return
  }
  editorEngine.apply({
    type: 'unset',
    path: [{_key: oldNode._key}],
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

  // Update the root props on the block.
  // Strip children (managed by dedicated operations below).
  const {children: _children, ...blockProps} = engineBlock as unknown as Record<
    string,
    unknown
  >

  setNodeProperties(editorEngine, blockProps, [{_key: oldEngineBlock._key}])

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
    setNodeProperties(editorEngine, removedProperties, [
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
      setNodeProperties(editorEngine, {children: engineBlock.children}, [
        {_key: oldEngineBlock._key},
      ])
      editorEngine.onChange()
      return
    }

    const oldBlockChildrenLength = oldEngineBlock.children.length

    if (engineBlock.children.length < oldBlockChildrenLength) {
      // Remove any children that have become superfluous
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
          // Update if this is the same child (same key and type)
          if (
            currentBlockChild._key === oldBlockChild?._key &&
            currentBlockChild._type === oldBlockChild?._type
          ) {
            debug.syncValue(
              'Updating changed child',
              currentBlockChild,
              oldBlockChild,
            )

            const {text: _text, ...childProps} =
              currentBlockChild as unknown as Record<string, unknown>

            setNodeProperties(editorEngine, childProps, path)

            const isSpanNode =
              isSpan({schema: context.schema}, currentBlockChild) &&
              isSpan({schema: context.schema}, oldBlockChild)

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

              editorEngine.apply({
                type: 'insert_text',
                path,
                offset: 0,
                text: currentBlockChild.text,
              })

              editorEngine.onChange()
            } else if (!isSpanNode) {
              debug.syncValue(
                'Updating changed inline object child',
                currentBlockChild,
              )
            }
          } else if (oldBlockChild) {
            debug.syncValue('Replacing child', currentBlockChild)

            const oldChild = oldEngineBlock.children[currentBlockChildIndex]
            if (!oldChild) {
              return
            }
            editorEngine.apply({
              type: 'unset',
              path: [
                {_key: oldEngineBlock._key},
                'children',
                {_key: oldChild._key},
              ],
            })
            const prevSibling =
              currentBlockChildIndex > 0
                ? oldEngineBlock.children[currentBlockChildIndex - 1]
                : undefined
            if (prevSibling) {
              editorEngine.apply({
                type: 'insert',
                path: [
                  {_key: oldEngineBlock._key},
                  'children',
                  {_key: prevSibling._key},
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
          } else if (!oldBlockChild) {
            // Insert it if it didn't exist before
            debug.syncValue('Inserting new child', currentBlockChild)

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
