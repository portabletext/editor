import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import {Editor, type Descendant, type Operation} from 'slate'
import {createApplyPatch} from '../../internal-utils/applyPatch'
import {debugWithName} from '../../internal-utils/debug'
import {
  insertNodePatch,
  insertTextPatch,
  mergeNodePatch,
  moveNodePatch,
  removeNodePatch,
  removeTextPatch,
  setNodePatch,
  splitNodePatch,
} from '../../internal-utils/operation-to-patches'
import {fromSlateValue, isEqualToEmptyEditor} from '../../internal-utils/values'
import {
  IS_PROCESSING_REMOTE_CHANGES,
  KEY_TO_VALUE_ELEMENT,
} from '../../internal-utils/weakMaps'
import {withRemoteChanges} from '../../internal-utils/withChanges'
import {
  isPatching,
  PATCHING,
  withoutPatching,
} from '../../internal-utils/withoutPatching'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import type {RelayActor} from '../relay-machine'
import {getCurrentOperationId} from '../with-applying-behavior-operations'
import {withoutSaving} from './createWithUndoRedo'

const debug = debugWithName('plugin:withPatches')
const debugVerbose = false

interface Options {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export function createWithPatches({
  editorActor,
  relayActor,
  subscriptions,
}: Options): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  // The previous editor children are needed to figure out the _key of deleted nodes
  // The editor.children would no longer contain that information if the node is already deleted.
  let previousChildren: Descendant[]

  const applyPatch = createApplyPatch(editorActor.getSnapshot().context.schema)

  return function withPatches(editor: PortableTextSlateEditor) {
    IS_PROCESSING_REMOTE_CHANGES.set(editor, false)
    PATCHING.set(editor, true)
    previousChildren = [...editor.children]

    const {apply} = editor
    let bufferedPatches: Patch[] = []

    const handleBufferedRemotePatches = () => {
      if (bufferedPatches.length === 0) {
        return
      }
      const patches = bufferedPatches
      bufferedPatches = []
      let changed = false

      withRemoteChanges(editor, () => {
        Editor.withoutNormalizing(editor, () => {
          withoutPatching(editor, () => {
            withoutSaving(editor, () => {
              for (const patch of patches) {
                if (debug.enabled)
                  debug(`Handling remote patch ${JSON.stringify(patch)}`)

                try {
                  changed = applyPatch(editor, patch)
                } catch (error) {
                  console.error(
                    `Applying patch ${JSON.stringify(patch)} failed due to: ${error.message}`,
                  )
                }
              }
            })
          })
        })
        if (changed) {
          editor.normalize()
          editor.onChange()
        }
      })
    }

    const handlePatches = ({patches}: {patches: Patch[]}) => {
      const remotePatches = patches.filter((p) => p.origin !== 'local')
      if (remotePatches.length === 0) {
        return
      }
      bufferedPatches = bufferedPatches.concat(remotePatches)
      handleBufferedRemotePatches()
    }

    subscriptions.push(() => {
      debug('Subscribing to remote patches')
      const sub = editorActor.on('patches', handlePatches)
      return () => {
        debug('Unsubscribing to remote patches')
        sub.unsubscribe()
      }
    })

    editor.apply = (operation: Operation): void | Editor => {
      let patches: Patch[] = []

      // Update previous children here before we apply
      previousChildren = editor.children

      const editorWasEmpty = isEqualToEmptyEditor(
        previousChildren,
        editorActor.getSnapshot().context.schema,
      )

      // Apply the operation
      apply(operation)

      const editorIsEmpty = isEqualToEmptyEditor(
        editor.children,
        editorActor.getSnapshot().context.schema,
      )

      if (!isPatching(editor)) {
        if (debugVerbose && debug.enabled)
          debug(
            `Editor is not producing patch for operation ${operation.type}`,
            operation,
          )
        return editor
      }

      // If the editor was empty and now isn't, insert the placeholder into it.
      if (
        editorWasEmpty &&
        !editorIsEmpty &&
        operation.type !== 'set_selection'
      ) {
        patches.push(insert(previousChildren, 'before', [0]))
      }

      switch (operation.type) {
        case 'insert_text':
          patches = [
            ...patches,
            ...insertTextPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'remove_text':
          patches = [
            ...patches,
            ...removeTextPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'remove_node':
          patches = [
            ...patches,
            ...removeNodePatch(
              editorActor.getSnapshot().context.schema,
              previousChildren,
              operation,
            ),
          ]
          break
        case 'split_node':
          patches = [
            ...patches,
            ...splitNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'insert_node':
          patches = [
            ...patches,
            ...insertNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'set_node':
          patches = [
            ...patches,
            ...setNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
            ),
          ]
          break
        case 'merge_node':
          patches = [
            ...patches,
            ...mergeNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'move_node':
          patches = [
            ...patches,
            ...moveNodePatch(
              editorActor.getSnapshot().context.schema,
              previousChildren,
              operation,
            ),
          ]
          break
        default:
        // Do nothing
      }

      // Unset the value if a operation made the editor empty
      if (
        !editorWasEmpty &&
        editorIsEmpty &&
        ['merge_node', 'set_node', 'remove_text', 'remove_node'].includes(
          operation.type,
        )
      ) {
        patches = [...patches, unset([])]
        relayActor.send({
          type: 'unset',
          previousValue: fromSlateValue(
            previousChildren,
            editorActor.getSnapshot().context.schema.block.name,
            KEY_TO_VALUE_ELEMENT.get(editor),
          ),
        })
      }

      // Prepend patches with setIfMissing if going from empty editor to something involving a patch.
      if (editorWasEmpty && patches.length > 0) {
        patches = [setIfMissing([], []), ...patches]
      }

      // Emit all patches
      if (patches.length > 0) {
        for (const patch of patches) {
          editorActor.send({
            type: 'internal.patch',
            patch: {...patch, origin: 'local'},
            operationId: getCurrentOperationId(editor),
            value: editor.value,
          })
        }
      }
      return editor
    }
    return editor
  }
}
