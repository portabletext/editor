import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import type {RelayActor} from '../editor/relay-machine'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {debug} from '../internal-utils/debug'
import {
  insertNodePatch,
  insertTextPatch,
  removeNodePatch,
  removeTextPatch,
  setNodeKeyedPatch,
  setNodePatch,
} from '../internal-utils/operation-to-patches'
import {safeStringify} from '../internal-utils/safe-json'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {Editor, Operation} from '../slate'
import {normalize} from '../slate/editor/normalize'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withRemoteChanges} from './slate-plugin.remote-changes'
import {pluginWithoutHistory} from './slate-plugin.without-history'
import {withoutPatching} from './slate-plugin.without-patching'

interface Options {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export function createPatchesPlugin({
  editorActor,
  relayActor,
  subscriptions,
}: Options): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  // The previous editor value are needed to figure out the _key of deleted nodes
  // The editor.children as Array<PortableTextBlock> would no longer contain that information if the node is already deleted.
  let previousValue: PortableTextBlock[]

  const applyPatch = createApplyPatch(editorActor.getSnapshot().context)

  return function patchesPlugin(editor: PortableTextSlateEditor) {
    previousValue = [...(editor.children as Array<PortableTextBlock>)]

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
        withoutNormalizing(editor, () => {
          withoutPatching(editor, () => {
            pluginWithoutHistory(editor, () => {
              for (const patch of patches) {
                try {
                  changed = applyPatch(editor, patch)

                  if (changed) {
                    debug.syncPatch(`(applied) ${safeStringify(patch, 2)}`)
                  } else {
                    debug.syncPatch(`(ignored) ${safeStringify(patch, 2)}`)
                  }
                } catch (error) {
                  console.error(
                    `Applying patch ${safeStringify(patch)} failed due to: ${error instanceof Error ? error.message : error}`,
                  )
                }
              }
            })
          })
        })
        if (changed) {
          normalize(editor)
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
      debug.syncPatch('subscribing to remote patches')
      const sub = editorActor.on('patches', handlePatches)
      return () => {
        debug.syncPatch('unsubscribing to remote patches')
        sub.unsubscribe()
      }
    })

    editor.apply = (operation: Operation): void | Editor => {
      let patches: Patch[] = []

      // Update previous children here before we apply
      previousValue = editor.children as Array<PortableTextBlock>

      const editorWasEmpty = isEqualToEmptyEditor(
        editorActor.getSnapshot().context.initialValue,
        previousValue,
        editorActor.getSnapshot().context.schema,
      )

      // Apply the operation
      apply(operation)

      const editorIsEmpty = isEqualToEmptyEditor(
        editorActor.getSnapshot().context.initialValue,
        editor.children as Array<PortableTextBlock>,
        editorActor.getSnapshot().context.schema,
      )

      if (!editor.isPatching) {
        return editor
      }

      // If the editor was empty and now isn't, insert the placeholder into it.
      if (
        editorWasEmpty &&
        !editorIsEmpty &&
        operation.type !== 'set_selection'
      ) {
        patches.push(insert(previousValue, 'before', [0]))
      }

      switch (operation.type) {
        case 'insert_text':
          patches = [
            ...patches,
            ...insertTextPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              operation,
              previousValue,
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
              previousValue,
            ),
          ]
          break
        case 'remove_node':
          patches = [
            ...patches,
            ...removeNodePatch(
              editorActor.getSnapshot().context.schema,
              previousValue,
              operation,
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
              previousValue,
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
        case 'set_node_keyed':
          patches = [
            ...patches,
            ...setNodeKeyedPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
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
        ['set_node', 'set_node_keyed', 'remove_text', 'remove_node'].includes(
          operation.type,
        )
      ) {
        patches = [...patches, unset([])]
        relayActor.send({
          type: 'unset',
          previousValue,
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
            operationId: editor.undoStepId,
            value: editor.children as Array<PortableTextBlock>,
          })
        }
      }
      return editor
    }
    return editor
  }
}
