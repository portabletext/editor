import type {Patch} from '@portabletext/patches'
import {isSpan} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import {isEqual} from 'lodash'
import {deleteText, Editor, Transforms, type Descendant, type Node} from 'slate'
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
import {debugWithName} from '../internal-utils/debug'
import {validateValue} from '../internal-utils/validateValue'
import {toSlateBlock, VOID_CHILD_KEY} from '../internal-utils/values'
import type {PickFromUnion} from '../type-utils'
import type {
  InvalidValueResolution,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {withoutSaving} from './plugins/createWithUndoRedo'
import {isChangingRemotely, withRemoteChanges} from './withChanges'
import {withoutPatching} from './withoutPatching'

const debug = debugWithName('sync machine')

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
      isProcessingLocalChanges: boolean
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
          type: 'has pending mutations'
        }
      | {
          type: 'mutation'
        }
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
      const isProcessingLocalChanges = context.isProcessingLocalChanges
      const isChanging = isChangingRemotely(context.slateEditor) ?? false
      const isBusy = isProcessingLocalChanges || isChanging

      debug('isBusy', {isBusy, isProcessingLocalChanges, isChanging})

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
      return (
        event.type === 'update value' && context.previousValue !== event.value
      )
    },
    'value changed while syncing': ({context, event}) => {
      assertEvent(event, 'done syncing')
      return context.pendingValue !== event.value
    },
    'pending value equals previous value': ({context}) => {
      return isEqual(context.pendingValue, context.previousValue)
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
    isProcessingLocalChanges: false,
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
    'has pending mutations': {
      actions: assign({
        isProcessingLocalChanges: true,
      }),
    },
    'mutation': {
      actions: assign({
        isProcessingLocalChanges: false,
      }),
    },
    'update readOnly': {
      actions: ['assign readOnly'],
    },
  },
  initial: 'idle',
  states: {
    idle: {
      entry: [
        () => {
          debug('entry: syncing->idle')
        },
      ],
      exit: [
        () => {
          debug('exit: syncing->idle')
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
                debug('no new value – setting initial value as synced')
              },
              'assign initial value synced',
              'emit done syncing value',
            ],
          },
          {
            actions: [
              () => {
                debug('no new value and initial value already synced')
              },
            ],
          },
        ],
      },
    },
    busy: {
      entry: [
        () => {
          debug('entry: syncing->busy')
        },
      ],
      exit: [
        () => {
          debug('exit: syncing->busy')
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
                debug('reenter: syncing->busy')
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
          debug('entry: syncing->syncing')
        },
        'emit syncing value',
      ],
      exit: [
        () => {
          debug('exit: syncing->syncing')
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
    debug('Value is empty')

    clearEditor({
      slateEditor,
      doneSyncing,
      hadSelection,
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
    debug('Invalid value, returning')

    doneSyncing = true

    sendBack({type: 'done syncing', value})

    return
  }

  if (isChanged) {
    debug('Server value changed, syncing editor')
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

    if (hadSelection && !slateEditor.selection) {
      Transforms.select(slateEditor, {
        anchor: {path: [0, 0], offset: 0},
        focus: {path: [0, 0], offset: 0},
      })

      slateEditor.onChange()
    }

    sendBack({type: 'value changed', value})
  } else {
    debug('Server value and editor value is equal, no need to sync.')
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
  hadSelection,
}: {
  slateEditor: PortableTextSlateEditor
  doneSyncing: boolean
  hadSelection: boolean
}) {
  Editor.withoutNormalizing(slateEditor, () => {
    withoutSaving(slateEditor, () => {
      withRemoteChanges(slateEditor, () => {
        withoutPatching(slateEditor, () => {
          if (doneSyncing) {
            return
          }

          if (hadSelection) {
            Transforms.deselect(slateEditor)
          }

          const childrenLength = slateEditor.children.length

          slateEditor.children.forEach((_, index) => {
            Transforms.removeNodes(slateEditor, {
              at: [childrenLength - 1 - index],
            })
          })

          Transforms.insertNodes(
            slateEditor,
            slateEditor.pteCreateTextBlock({decorators: []}),
            {at: [0]},
          )

          // Add a new selection in the top of the document
          if (hadSelection) {
            Transforms.select(slateEditor, [0, 0])
          }
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
            Transforms.removeNodes(slateEditor, {
              at: [i],
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
  const oldBlock = slateEditor.children.at(index)

  if (!oldBlock) {
    // Insert the new block
    const validation = validateValue(
      [block],
      context.schema,
      context.keyGenerator,
    )

    if (debug.enabled)
      debug('Validating and inserting new block in the end of the value', block)

    if (validation.valid || validation.resolution?.autoResolve) {
      const slateBlock = toSlateBlock(block, {
        schemaTypes: context.schema,
      })

      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            Transforms.insertNodes(slateEditor, slateBlock, {
              at: [index],
            })
          })
        })
      })

      return {
        blockChanged: true,
        blockValid: true,
      }
    }

    debug('Invalid', validation)

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

  if (isEqual(block, oldBlock)) {
    // Nothing to sync, skipping the block
    return {
      blockChanged: false,
      blockValid: true,
    }
  }

  const validationValue = [value[index]]
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
        `${validation.resolution.action} for block with _key '${validationValue[0]._key}'. ${validation.resolution?.description}`,
      )
      validation.resolution.patches.forEach((patch) => {
        sendBack({type: 'patch', patch})
      })
    }
  }

  if (validation.valid || validation.resolution?.autoResolve) {
    if (oldBlock._key === block._key) {
      if (debug.enabled) debug('Updating block', oldBlock, block)

      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            updateBlock({
              context,
              slateEditor,
              oldBlock,
              block,
              index,
            })
          })
        })
      })
    } else {
      if (debug.enabled) debug('Replacing block', oldBlock, block)

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
    Transforms.deselect(slateEditor)
  }

  Transforms.removeNodes(slateEditor, {at: [index]})
  Transforms.insertNodes(slateEditor, slateBlock, {at: [index]})

  slateEditor.onChange()

  if (selectionFocusOnBlock) {
    Transforms.select(slateEditor, currentSelection)
  }
}

function updateBlock({
  context,
  slateEditor,
  oldBlock,
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
  oldBlock: Descendant
  block: PortableTextBlock
  index: number
}) {
  const slateBlock = toSlateBlock(block, {
    schemaTypes: context.schema,
  })

  // Update the root props on the block
  Transforms.setNodes(slateEditor, slateBlock as Partial<Node>, {
    at: [index],
  })

  // Text block's need to have their children updated as well (setNode does not target a node's children)
  if (
    slateEditor.isTextBlock(slateBlock) &&
    slateEditor.isTextBlock(oldBlock)
  ) {
    const oldBlockChildrenLength = oldBlock.children.length
    if (slateBlock.children.length < oldBlockChildrenLength) {
      // Remove any children that have become superfluous
      Array.from(
        Array(oldBlockChildrenLength - slateBlock.children.length),
      ).forEach((_, index) => {
        const childIndex = oldBlockChildrenLength - 1 - index

        if (childIndex > 0) {
          debug('Removing child')

          Transforms.removeNodes(slateEditor, {
            at: [index, childIndex],
          })
        }
      })
    }

    slateBlock.children.forEach((currentBlockChild, currentBlockChildIndex) => {
      const oldBlockChild = oldBlock.children[currentBlockChildIndex]
      const isChildChanged = !isEqual(currentBlockChild, oldBlockChild)
      const isTextChanged = !isEqual(
        currentBlockChild.text,
        oldBlockChild?.text,
      )
      const path = [index, currentBlockChildIndex]

      if (isChildChanged) {
        // Update if this is the same child
        if (currentBlockChild._key === oldBlockChild?._key) {
          debug('Updating changed child', currentBlockChild, oldBlockChild)

          Transforms.setNodes(slateEditor, currentBlockChild as Partial<Node>, {
            at: path,
          })

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

            Transforms.insertText(slateEditor, currentBlockChild.text, {
              at: path,
            })

            slateEditor.onChange()
          } else if (!isSpanNode) {
            // If it's a inline block, also update the void text node key
            debug('Updating changed inline object child', currentBlockChild)

            Transforms.setNodes(
              slateEditor,
              {_key: VOID_CHILD_KEY},
              {
                at: [...path, 0],
                voids: true,
              },
            )
          }
        } else if (oldBlockChild) {
          // Replace the child if _key's are different
          debug('Replacing child', currentBlockChild)

          Transforms.removeNodes(slateEditor, {
            at: [index, currentBlockChildIndex],
          })
          Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
            at: [index, currentBlockChildIndex],
          })

          slateEditor.onChange()
        } else if (!oldBlockChild) {
          // Insert it if it didn't exist before
          debug('Inserting new child', currentBlockChild)

          Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
            at: [index, currentBlockChildIndex],
          })

          slateEditor.onChange()
        }
      }
    })
  }
}
