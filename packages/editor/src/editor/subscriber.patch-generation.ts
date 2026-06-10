import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {
  insertNodePatch,
  textPatch,
} from '../internal-utils/operation-to-patches'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'

/**
 * Converts every applied operation into `@portabletext/patches` and sends
 * them to the editor actor as `internal.patch` events.
 */
export function subscribePatchGeneration({
  editorActor,
  editor,
}: {
  editorActor: EditorActor
  editor: PortableTextEditorEngine
}): () => void {
  return subscribeToOperations(editor, (event) => {
    if (!event.isPatching) {
      // Remote patch application and value sync apply operations with
      // patching suppressed; bail before computing anything so those hot
      // paths pay nothing here.
      return
    }

    const operation = event.operation
    // The pre-apply value is needed to figure out the `_key` of deleted
    // nodes. The editor.snapshot.context.value would no longer contain
    // that information if the node is already deleted.
    const previousValue = event.beforeValue
    let patches: Patch[] = []

    const snapshot = editorActor.getSnapshot()
    const {initialValue, schema} = snapshot.context

    const editorWasEmpty =
      previousValue.length === 1 &&
      isEqualToEmptyEditor(initialValue, previousValue, schema)

    const editorIsEmpty =
      editor.snapshot.context.value.length === 1 &&
      isEqualToEmptyEditor(initialValue, editor.snapshot.context.value, schema)

    // If the editor was empty and now isn't, insert the placeholder into it.
    if (
      editorWasEmpty &&
      !editorIsEmpty &&
      operation.type !== 'set.selection'
    ) {
      patches.push(insert(previousValue, 'before', [0]))
    }

    switch (operation.type) {
      case 'insert.text':
        patches = [
          ...patches,
          ...textPatch(editor.snapshot, operation, previousValue),
        ]
        break
      case 'remove.text':
        patches = [
          ...patches,
          ...textPatch(editor.snapshot, operation, previousValue),
        ]
        break
      case 'insert':
        patches = [...patches, ...insertNodePatch(operation)]
        break
      case 'set':
        patches = [...patches, set(operation.value, operation.path)]
        break
      case 'unset':
        patches = [...patches, unset(operation.path)]
        break
      default:
      // Do nothing
    }

    // Unset the value if a operation made the editor empty
    if (
      !editorWasEmpty &&
      editorIsEmpty &&
      ['set', 'unset', 'remove.text'].includes(operation.type)
    ) {
      patches = [...patches, unset([])]
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
          operationId: event.undoStepId,
          value: editor.snapshot.context.value,
        })
      }
    }
  })
}
