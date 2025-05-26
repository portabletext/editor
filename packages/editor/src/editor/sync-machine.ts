import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {isEqual} from 'lodash'
import {Editor, Text, Transforms, type Descendant, type Node} from 'slate'
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
import type {ActorRefFrom} from 'xstate'
import {debugWithName} from '../internal-utils/debug'
import {validateValue} from '../internal-utils/validateValue'
import {toSlateValue, VOID_CHILD_KEY} from '../internal-utils/values'
import {
  isChangingRemotely,
  withRemoteChanges,
} from '../internal-utils/withChanges'
import {withoutPatching} from '../internal-utils/withoutPatching'
import type {PickFromUnion} from '../type-utils'
import type {
  InvalidValueResolution,
  PortableTextSlateEditor,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {withoutSaving} from './plugins/createWithUndoRedo'

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
      const editable = !context.readOnly
      const isProcessingLocalChanges = context.isProcessingLocalChanges
      const isChanging = isChangingRemotely(context.slateEditor) ?? false
      const isBusy = editable && (isProcessingLocalChanges || isChanging)

      debug('isBusy', {isBusy, editable, isProcessingLocalChanges, isChanging})

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

  // If empty value, remove everything in the editor and insert a placeholder block
  if (!value || value.length === 0) {
    debug('Value is empty')
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
    isChanged = true
  }
  // Remove, replace or add nodes according to what is changed.
  if (value && value.length > 0) {
    const slateValueFromProps = toSlateValue(value, {
      schemaTypes: context.schema,
    })

    if (streamBlocks) {
      await new Promise<void>((resolve) => {
        Editor.withoutNormalizing(slateEditor, () => {
          withRemoteChanges(slateEditor, () => {
            withoutPatching(slateEditor, () => {
              if (doneSyncing) {
                resolve()
                return
              }

              isChanged = removeExtraBlocks({
                slateEditor,
                slateValueFromProps,
              })

              const processBlocks = async () => {
                for await (const [
                  currentBlock,
                  currentBlockIndex,
                ] of getStreamedBlocks({
                  slateValue: slateValueFromProps,
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
                }

                resolve()
              }

              processBlocks()
            })
          })
        })
      })
    } else {
      Editor.withoutNormalizing(slateEditor, () => {
        withRemoteChanges(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            if (doneSyncing) {
              return
            }

            isChanged = removeExtraBlocks({
              slateEditor,
              slateValueFromProps,
            })

            let index = 0

            for (const currentBlock of slateValueFromProps) {
              const {blockChanged, blockValid} = syncBlock({
                context,
                sendBack,
                block: currentBlock,
                index,
                slateEditor,
                value,
              })

              isChanged = blockChanged || isChanged
              isValid = isValid && blockValid
              index++
            }
          })
        })
      })
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

function removeExtraBlocks({
  slateEditor,
  slateValueFromProps,
}: {
  slateEditor: PortableTextSlateEditor
  slateValueFromProps: Array<Descendant>
}) {
  let isChanged = false
  const childrenLength = slateEditor.children.length

  // Remove blocks that have become superfluous
  if (slateValueFromProps.length < childrenLength) {
    for (let i = childrenLength - 1; i > slateValueFromProps.length - 1; i--) {
      Transforms.removeNodes(slateEditor, {
        at: [i],
      })
    }
    isChanged = true
  }
  return isChanged
}

async function* getStreamedBlocks({
  slateValue,
}: {
  slateValue: Array<Descendant>
}) {
  let index = 0
  for await (const block of slateValue) {
    if (index % 10 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    yield [block, index] as const
    index++
  }
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
  block: Descendant
  index: number
  slateEditor: PortableTextSlateEditor
  value: Array<PortableTextBlock>
}) {
  let blockChanged = false
  let blockValid = true
  const currentBlock = block
  const currentBlockIndex = index
  const oldBlock = slateEditor.children[currentBlockIndex]
  const hasChanges = oldBlock && !isEqual(currentBlock, oldBlock)

  Editor.withoutNormalizing(slateEditor, () => {
    withRemoteChanges(slateEditor, () => {
      withoutPatching(slateEditor, () => {
        if (hasChanges && blockValid) {
          const validationValue = [value[currentBlockIndex]]
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
            if (oldBlock._key === currentBlock._key) {
              if (debug.enabled) debug('Updating block', oldBlock, currentBlock)
              _updateBlock(
                slateEditor,
                currentBlock,
                oldBlock,
                currentBlockIndex,
              )
            } else {
              if (debug.enabled)
                debug('Replacing block', oldBlock, currentBlock)
              _replaceBlock(slateEditor, currentBlock, currentBlockIndex)
            }
            blockChanged = true
          } else {
            sendBack({
              type: 'invalid value',
              resolution: validation.resolution,
              value,
            })
            blockValid = false
          }
        }

        if (!oldBlock && blockValid) {
          const validationValue = [value[currentBlockIndex]]
          const validation = validateValue(
            validationValue,
            context.schema,
            context.keyGenerator,
          )
          if (debug.enabled)
            debug(
              'Validating and inserting new block in the end of the value',
              currentBlock,
            )
          if (validation.valid || validation.resolution?.autoResolve) {
            Transforms.insertNodes(slateEditor, currentBlock, {
              at: [currentBlockIndex],
            })
          } else {
            debug('Invalid', validation)
            sendBack({
              type: 'invalid value',
              resolution: validation.resolution,
              value,
            })
            blockValid = false
          }
        }
      })
    })
  })

  return {blockChanged, blockValid}
}

/**
 * This code is moved out of the above algorithm to keep complexity down.
 * @internal
 */
function _replaceBlock(
  slateEditor: PortableTextSlateEditor,
  currentBlock: Descendant,
  currentBlockIndex: number,
) {
  // While replacing the block and the current selection focus is on the replaced block,
  // temporarily deselect the editor then optimistically try to restore the selection afterwards.
  const currentSelection = slateEditor.selection
  const selectionFocusOnBlock =
    currentSelection && currentSelection.focus.path[0] === currentBlockIndex
  if (selectionFocusOnBlock) {
    Transforms.deselect(slateEditor)
  }
  Transforms.removeNodes(slateEditor, {at: [currentBlockIndex]})
  Transforms.insertNodes(slateEditor, currentBlock, {at: [currentBlockIndex]})
  slateEditor.onChange()
  if (selectionFocusOnBlock) {
    Transforms.select(slateEditor, currentSelection)
  }
}

/**
 * This code is moved out of the above algorithm to keep complexity down.
 * @internal
 */
function _updateBlock(
  slateEditor: PortableTextSlateEditor,
  currentBlock: Descendant,
  oldBlock: Descendant,
  currentBlockIndex: number,
) {
  // Update the root props on the block
  Transforms.setNodes(slateEditor, currentBlock as Partial<Node>, {
    at: [currentBlockIndex],
  })
  // Text block's need to have their children updated as well (setNode does not target a node's children)
  if (
    slateEditor.isTextBlock(currentBlock) &&
    slateEditor.isTextBlock(oldBlock)
  ) {
    const oldBlockChildrenLength = oldBlock.children.length
    if (currentBlock.children.length < oldBlockChildrenLength) {
      // Remove any children that have become superfluous
      Array.from(
        Array(oldBlockChildrenLength - currentBlock.children.length),
      ).forEach((_, index) => {
        const childIndex = oldBlockChildrenLength - 1 - index
        if (childIndex > 0) {
          debug('Removing child')
          Transforms.removeNodes(slateEditor, {
            at: [currentBlockIndex, childIndex],
          })
        }
      })
    }
    currentBlock.children.forEach(
      (currentBlockChild, currentBlockChildIndex) => {
        const oldBlockChild = oldBlock.children[currentBlockChildIndex]
        const isChildChanged = !isEqual(currentBlockChild, oldBlockChild)
        const isTextChanged = !isEqual(
          currentBlockChild.text,
          oldBlockChild?.text,
        )
        const path = [currentBlockIndex, currentBlockChildIndex]
        if (isChildChanged) {
          // Update if this is the same child
          if (currentBlockChild._key === oldBlockChild?._key) {
            debug('Updating changed child', currentBlockChild, oldBlockChild)
            Transforms.setNodes(
              slateEditor,
              currentBlockChild as Partial<Node>,
              {
                at: path,
              },
            )
            const isSpanNode =
              Text.isText(currentBlockChild) &&
              currentBlockChild._type === 'span' &&
              Text.isText(oldBlockChild) &&
              oldBlockChild._type === 'span'
            if (isSpanNode && isTextChanged) {
              if (oldBlockChild.text.length > 0) {
                Transforms.delete(slateEditor, {
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
            // Replace the child if _key's are different
          } else if (oldBlockChild) {
            debug('Replacing child', currentBlockChild)
            Transforms.removeNodes(slateEditor, {
              at: [currentBlockIndex, currentBlockChildIndex],
            })
            Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
              at: [currentBlockIndex, currentBlockChildIndex],
            })
            slateEditor.onChange()
            // Insert it if it didn't exist before
          } else if (!oldBlockChild) {
            debug('Inserting new child', currentBlockChild)
            Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
              at: [currentBlockIndex, currentBlockChildIndex],
            })
            slateEditor.onChange()
          }
        }
      },
    )
  }
}
