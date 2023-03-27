/* eslint-disable max-nested-callbacks */
import React, {useMemo, useRef} from 'react'
import {PortableTextBlock} from '@sanity/types'
import {isEqual} from 'lodash'
import {Editor, Transforms, Node, Descendant} from 'slate'
import {useSlate} from '@sanity/slate-react'
import {PortableTextEditor} from '../PortableTextEditor'
import {EditorChange, PortableTextSlateEditor} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {toSlateValue} from '../../utils/values'
import {KEY_TO_SLATE_ELEMENT} from '../../utils/weakMaps'
import {withoutSaving} from '../plugins/createWithUndoRedo'
import {withPreserveKeys} from '../../utils/withPreserveKeys'
import {withoutPatching} from '../../utils/withoutPatching'
import {validateValue} from '../../utils/validateValue'

const debug = debugWithName('hook:useSyncValue')

/**
 * @internal
 */
export interface UseSyncValueProps {
  isPending: React.MutableRefObject<boolean | null>
  keyGenerator: () => string
  onChange: (change: EditorChange) => void
  portableTextEditor: PortableTextEditor
  readOnly: boolean
}

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
export function useSyncValue(
  props: UseSyncValueProps
): (value: PortableTextBlock[] | undefined, userCallbackFn?: () => void) => void {
  const {portableTextEditor, isPending, readOnly, keyGenerator} = props
  const {change$, schemaTypes} = portableTextEditor
  const previousValue = useRef<PortableTextBlock[] | undefined>()
  const slateEditor = useSlate()
  return useMemo(
    () => (value: PortableTextBlock[] | undefined) => {
      // Don't sync the value if there are pending local changes.
      // The value will be synced again after the local changes are submitted.
      if (isPending.current && !readOnly) {
        debug('Has local patches')
        return
      }

      if (previousValue.current === value) {
        debug('Value is the same object')
        change$.next({type: 'value', value})
        return
      }

      if (value && value.length === 0) {
        const validation = validateValue(value, schemaTypes, keyGenerator)
        change$.next({
          type: 'invalidValue',
          resolution: validation.resolution,
          value,
        })
        return
      }

      let isChanged = false
      previousValue.current = value

      // If empty value, remove everything in the editor and insert a placeholder block
      if (!value || value.length === 0) {
        debug('Value is empty')
        const hadSelection = !!slateEditor.selection
        withoutSaving(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            Editor.withoutNormalizing(slateEditor, () => {
              Transforms.deselect(slateEditor)
              const childrenLength = slateEditor.children.length
              slateEditor.children.forEach((_, index) => {
                Transforms.removeNodes(slateEditor, {
                  at: [childrenLength - 1 - index],
                })
              })
              Transforms.insertNodes(slateEditor, slateEditor.createPlaceholderBlock(), {at: [0]})
              if (hadSelection) {
                Transforms.select(slateEditor, [0, 0])
              }
            })
          })
        })
        isChanged = true
      }
      // Remove, replace or add nodes according to what is changed.
      if (value && value.length > 0) {
        const slateValueFromProps = toSlateValue(
          value,
          {
            schemaTypes,
          },
          KEY_TO_SLATE_ELEMENT.get(slateEditor)
        )
        withoutSaving(slateEditor, () => {
          withoutPatching(slateEditor, () => {
            Editor.withoutNormalizing(slateEditor, () => {
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
              // Go through all of the blocks and see if they need to be updated
              slateValueFromProps.forEach((currentBlock, currentBlockIndex) => {
                const oldBlock = slateEditor.children[currentBlockIndex]
                const hasChanges = oldBlock && !isEqual(currentBlock, oldBlock)
                if (hasChanges) {
                  const validationValue = [value[currentBlockIndex]]
                  const validation = validateValue(validationValue, schemaTypes, keyGenerator)
                  if (validation.valid) {
                    if (oldBlock._key === currentBlock._key) {
                      debug('Updating block', oldBlock, currentBlock)
                      _updateBlock(slateEditor, currentBlock, oldBlock, currentBlockIndex)
                    } else {
                      debug('Replacing block', oldBlock, currentBlock)
                      _replaceBlock(slateEditor, currentBlock, currentBlockIndex)
                    }
                    isChanged = true
                  } else {
                    change$.next({
                      type: 'invalidValue',
                      resolution: validation.resolution,
                      value,
                    })
                  }
                }
                // Insert new blocks exceeding the original value.
                if (!oldBlock) {
                  const validationValue = [value[currentBlockIndex]]
                  debug('Adding and validating new block', currentBlock)
                  const validation = validateValue(validationValue, schemaTypes, keyGenerator)
                  if (validation.valid) {
                    withPreserveKeys(slateEditor, () => {
                      Transforms.insertNodes(slateEditor, currentBlock, {at: [currentBlockIndex]})
                    })
                  } else {
                    change$.next({
                      type: 'invalidValue',
                      resolution: validation.resolution,
                      value,
                    })
                  }
                }
              })
            })
          })
        })
      }
      if (isChanged) {
        debug('Server value changed, syncing editor')
        Editor.normalize(slateEditor)
        slateEditor.onChange()
        change$.next({type: 'value', value})
      } else {
        debug('Server value and editor value is the same, no need to sync.')
      }
    },
    [change$, isPending, keyGenerator, readOnly, schemaTypes, slateEditor]
  )
}

/**
 * This code is moved out of the above algorithm to keep complexity down.
 * @internal
 */
function _replaceBlock(
  slateEditor: PortableTextSlateEditor,
  currentBlock: Descendant,
  currentBlockIndex: number
) {
  // While replacing the block, temporarily deselect the editor,
  // then optimistically try to restore the selection afterwards.
  const currentSel = slateEditor.selection
  Transforms.deselect(slateEditor)
  Transforms.removeNodes(slateEditor, {at: [currentBlockIndex]})
  withPreserveKeys(slateEditor, () => {
    Transforms.insertNodes(slateEditor, currentBlock, {at: [currentBlockIndex]})
  })
  if (currentSel) {
    Transforms.select(slateEditor, currentSel)
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
  currentBlockIndex: number
) {
  // Update the root props on the block
  Transforms.setNodes(slateEditor, currentBlock as Partial<Node>, {
    at: [currentBlockIndex],
  })
  // Text block's need to have their children updated as well (setNode does not target a node's children)
  if (slateEditor.isTextBlock(currentBlock) && slateEditor.isTextBlock(oldBlock)) {
    const oldBlockChildrenLength = oldBlock.children.length
    if (currentBlock.children.length < oldBlockChildrenLength) {
      // Remove any children that have become superfluous
      Array.from(Array(oldBlockChildrenLength - currentBlock.children.length)).forEach(
        (_, index) => {
          const childIndex = oldBlockChildrenLength - 1 - index
          if (childIndex > 0) {
            debug('Removing child')
            Transforms.removeNodes(slateEditor, {
              at: [currentBlockIndex, childIndex],
            })
          }
        }
      )
    }
    currentBlock.children.forEach((currentBlockChild, currentBlockChildIndex) => {
      const oldBlockChild = oldBlock.children[currentBlockChildIndex]
      const isChildChanged = !isEqual(currentBlockChild, oldBlockChild)
      if (isChildChanged) {
        // Update if this is the same child
        if (currentBlockChild._key === oldBlockChild?._key) {
          debug('Updating changed child', currentBlockChild)
          Transforms.setNodes(slateEditor, currentBlockChild as Partial<Node>, {
            at: [currentBlockIndex, currentBlockChildIndex],
          })
          // If it's a inline block, also update the void text node key
          if (currentBlockChild._type !== 'span') {
            debug('Updating changed inline object child', currentBlockChild)
            Transforms.setNodes(
              slateEditor,
              {_key: `${currentBlock._key}-void-child`},
              {
                at: [currentBlockIndex, currentBlockChildIndex, 0],
                voids: true,
              }
            )
          }
          // Replace the child if _key's are different
        } else if (oldBlockChild) {
          debug('Replacing child', currentBlockChild)
          Transforms.removeNodes(slateEditor, {
            at: [currentBlockIndex, currentBlockChildIndex],
          })
          withPreserveKeys(slateEditor, () => {
            Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
              at: [currentBlockIndex, currentBlockChildIndex],
            })
          })
          // Insert it if it didn't exist before
        } else if (!oldBlockChild) {
          debug('Inserting new child', currentBlockChild)
          withPreserveKeys(slateEditor, () => {
            Transforms.insertNodes(slateEditor, currentBlockChild as Node, {
              at: [currentBlockIndex, currentBlockChildIndex],
            })
          })
        }
      }
    })
  }
}
