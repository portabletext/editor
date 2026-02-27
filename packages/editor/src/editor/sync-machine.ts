import type {Patch} from '@portabletext/patches'
import {isSpan, type PortableTextBlock} from '@portabletext/schema'
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
import {applyDeselect, applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {debug} from '../internal-utils/debug'
import {
  isEqualBlocks,
  isEqualChild,
  isEqualValues,
} from '../internal-utils/equality'
import {validateValue} from '../internal-utils/validateValue'
import {toSlateBlock} from '../internal-utils/values'
import {deleteText, Editor, Node, Text, type Descendant} from '../slate'
import {withRemoteChanges} from '../slate-plugins/slate-plugin.remote-changes'
import {pluginWithoutHistory} from '../slate-plugins/slate-plugin.without-history'
import {withoutPatching} from '../slate-plugins/slate-plugin.without-patching'
import type {PickFromUnion} from '../type-utils'
import type {InvalidValueResolution} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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
    slateEditor: PortableTextSlateEditor
    streamBlocks: boolean
    value: Array<PortableTextBlock> | undefined
  }
> = ({sendBack, input}) => {
  updateValue({
    context: input.context,
    sendBack,
    slateEditor: input.slateEditor,
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
      slateEditor: PortableTextSlateEditor
      pendingValue: Array<PortableTextBlock> | undefined
      previousValue: Array<PortableTextBlock> | undefined
    },
    input: {} as {
      initialValue: Array<PortableTextBlock> | undefined
      keyGenerator: () => string
      schema: EditorSchema
      readOnly: boolean
      slateEditor: PortableTextSlateEditor
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
        context.slateEditor.isDeferringMutations ||
        context.slateEditor.isProcessingRemoteChanges

      debug.syncValue(
        JSON.stringify({
          isBusy,
          isDeferringMutations: context.slateEditor.isDeferringMutations,
          isProcessingRemoteChanges:
            context.slateEditor.isProcessingRemoteChanges,
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
    slateEditor: input.slateEditor,
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
            slateEditor: context.slateEditor,
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
  slateEditor,
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
  slateEditor: PortableTextSlateEditor
  streamBlocks: boolean
  value: PortableTextBlock[] | undefined
}) {
  let doneSyncing = false
  let isChanged = false
  let isValid = true

  const hadSelection = !!slateEditor.selection

  if (!value || value.length === 0) {
    clearEditor({
      slateEditor,
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
          slateEditor,
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
              slateEditor,
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
        slateEditor,
        value,
      })

      let index = 0

      for (const block of value) {
        const {blockChanged, blockValid} = syncBlock({
          context,
          sendBack,
          block,
          index,
          slateEditor,
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
      slateEditor.onChange()
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
      !slateEditor.selection &&
      slateEditor.children.length > 0
    ) {
      applySelect(slateEditor, Editor.start(slateEditor, []))
      slateEditor.onChange()
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
  slateEditor,
  doneSyncing,
}: {
  slateEditor: PortableTextSlateEditor
  doneSyncing: boolean
}) {
  Editor.withoutNormalizing(slateEditor, () => {
    pluginWithoutHistory(slateEditor, () => {
      withRemoteChanges(slateEditor, () => {
        withoutPatching(slateEditor, () => {
          if (doneSyncing) {
            return
          }

          const childrenLength = slateEditor.children.length

          slateEditor.children.forEach((_, index) => {
            const removePath = [childrenLength - 1 - index]
            const [removeNode] = Editor.node(slateEditor, removePath)
            slateEditor.apply({
              type: 'remove_node',
              path: removePath,
              node: removeNode,
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
  slateEditor,
  value,
}: {
  slateEditor: PortableTextSlateEditor
  value: Array<PortableTextBlock>
}) {
  let isChanged = false

  Editor.withoutNormalizing(slateEditor, () => {
    withRemoteChanges(slateEditor, () => {
      withoutPatching(slateEditor, () => {
        const childrenLength = slateEditor.children.length

        if (value.length < childrenLength) {
          for (let i = childrenLength - 1; i > value.length - 1; i--) {
            const [removeNode] = Editor.node(slateEditor, [i])
            slateEditor.apply({
              type: 'remove_node',
              path: [i],
              node: removeNode,
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
  slateEditor,
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
  slateEditor: PortableTextSlateEditor
  value: Array<PortableTextBlock>
}) {
  const oldSlateBlock = slateEditor.children.at(index)
  const oldBlock = slateEditor.value.at(index)

  if (!oldSlateBlock || !oldBlock) {
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
      const slateBlock = toSlateBlock(block, {
        schemaTypes: context.schema,
      })

      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            slateEditor.apply({
              type: 'insert_node',
              path: [index],
              node: slateBlock,
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

      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            updateBlock({
              context,
              slateEditor,
              oldSlateBlock,
              block,
              index,
            })
          })
        })
      })
    } else {
      debug.syncValue('Replacing block', oldBlock, block)

      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            replaceBlock({
              context,
              slateEditor,
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
  slateEditor,
  block,
  index,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  slateEditor: PortableTextSlateEditor
  block: PortableTextBlock
  index: number
}) {
  const slateBlock = toSlateBlock(block, {
    schemaTypes: context.schema,
  })

  // While replacing the block and the current selection focus is on the replaced block,
  // temporarily deselect the editor then optimistically try to restore the selection afterwards.
  const currentSelection = slateEditor.selection
  const selectionFocusOnBlock =
    currentSelection && currentSelection.focus.path[0] === index

  if (selectionFocusOnBlock) {
    applyDeselect(slateEditor)
  }

  const [oldNode] = Editor.node(slateEditor, [index])
  slateEditor.apply({type: 'remove_node', path: [index], node: oldNode})
  slateEditor.apply({type: 'insert_node', path: [index], node: slateBlock})

  slateEditor.onChange()

  if (
    selectionFocusOnBlock &&
    Node.has(slateEditor, currentSelection.anchor.path) &&
    Node.has(slateEditor, currentSelection.focus.path)
  ) {
    applySelect(slateEditor, currentSelection)
  }
}

function updateBlock({
  context,
  slateEditor,
  oldSlateBlock,
  block,
  index,
}: {
  context: {
    keyGenerator: () => string
    previousValue: Array<PortableTextBlock> | undefined
    readOnly: boolean
    schema: EditorSchema
  }
  slateEditor: PortableTextSlateEditor
  oldSlateBlock: Descendant
  block: PortableTextBlock
  index: number
}) {
  const slateBlock = toSlateBlock(block, {
    schemaTypes: context.schema,
  })

  // Update the root props on the block
  applySetNode(slateEditor, slateBlock as unknown as Record<string, unknown>, [
    index,
  ])

  // Text block's need to have their children updated as well (setNode does not target a node's children)
  if (
    slateEditor.isTextBlock(slateBlock) &&
    slateEditor.isTextBlock(oldSlateBlock)
  ) {
    const oldBlockChildrenLength = oldSlateBlock.children.length

    if (slateBlock.children.length < oldBlockChildrenLength) {
      // Remove any children that have become superfluous
      Array.from(
        Array(oldBlockChildrenLength - slateBlock.children.length),
      ).forEach((_, i) => {
        const childIndex = oldBlockChildrenLength - 1 - i

        if (childIndex > 0) {
          debug.syncValue('Removing child')

          const [childNode] = Editor.node(slateEditor, [index, childIndex])
          slateEditor.apply({
            type: 'remove_node',
            path: [index, childIndex],
            node: childNode,
          })
        }
      })
    }

    slateBlock.children.forEach((currentBlockChild, currentBlockChildIndex) => {
      const oldBlockChild = oldSlateBlock.children.at(currentBlockChildIndex)
      const isChildChanged =
        !oldBlockChild || !isEqualChild(currentBlockChild, oldBlockChild)
      const isTextChanged =
        oldBlockChild &&
        Text.isText(oldBlockChild) &&
        currentBlockChild.text !== oldBlockChild.text
      const path = [index, currentBlockChildIndex]

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

          applySetNode(
            slateEditor,
            currentBlockChild as unknown as Record<string, unknown>,
            path,
          )

          const isSpanNode =
            isSpan({schema: context.schema}, currentBlockChild) &&
            isSpan({schema: context.schema}, oldBlockChild)

          if (isSpanNode && isTextChanged) {
            if (oldBlockChild.text.length > 0) {
              deleteText(slateEditor, {
                at: {
                  focus: {path, offset: 0},
                  anchor: {path, offset: oldBlockChild.text.length},
                },
              })
            }

            slateEditor.apply({
              type: 'insert_text',
              path,
              offset: 0,
              text: currentBlockChild.text,
            })

            slateEditor.onChange()
          }
        } else if (oldBlockChild) {
          debug.syncValue('Replacing child', currentBlockChild)

          const [oldChild] = Editor.node(slateEditor, [
            index,
            currentBlockChildIndex,
          ])
          slateEditor.apply({
            type: 'remove_node',
            path: [index, currentBlockChildIndex],
            node: oldChild,
          })
          slateEditor.apply({
            type: 'insert_node',
            path: [index, currentBlockChildIndex],
            node: currentBlockChild as Node,
          })

          slateEditor.onChange()
        } else if (!oldBlockChild) {
          // Insert it if it didn't exist before
          debug.syncValue('Inserting new child', currentBlockChild)

          slateEditor.apply({
            type: 'insert_node',
            path: [index, currentBlockChildIndex],
            node: currentBlockChild as Node,
          })

          slateEditor.onChange()
        }
      }
    })
  }
}
