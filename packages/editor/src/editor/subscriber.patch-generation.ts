import {
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {subscribeToOperations} from '../engine/core/operation-channel'
import {
  insertNodePatch,
  textPatch,
} from '../internal-utils/operation-to-patches'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import type {RelayActor} from './relay-machine'

/**
 * Converts every applied operation into `@portabletext/patches` and sends
 * them to the editor actor as `internal.patch` events.
 */
export function subscribePatchGeneration({
  editorActor,
  relayActor,
  editor,
}: {
  editorActor: EditorActor
  relayActor: RelayActor
  editor: PortableTextEditorEngine
}): () => void {
  // The previous editor value is needed to figure out the _key of deleted
  // nodes. The editor.snapshot.context.value would no longer contain that
  // information if the node is already deleted.
  //
  // A shared closure rather than `event.beforeValue`: when a normalization
  // fix applies nested operations, the triggering operation's `after`
  // listener reads the value as of the most recent (nested) apply, not its
  // own pre-apply capture.
  let previousValue: Array<PortableTextBlock> = [
    ...editor.snapshot.context.value,
  ]

  const unsubscribeBefore = subscribeToOperations(
    editor,
    () => {
      previousValue = editor.snapshot.context.value
    },
    {phase: 'before'},
  )

  const unsubscribeAfter = subscribeToOperations(editor, (event) => {
    const operation = event.operation
    let patches: Patch[] = []

    const snapshot = editorActor.getSnapshot()
    const {initialValue, schema} = snapshot.context

    // `event.beforeValue` rather than the `previousValue` closure: whether
    // the editor was empty is judged against this operation's own pre-apply
    // value, which nested operations may have overwritten in the closure.
    const editorWasEmpty =
      event.beforeValue.length === 1 &&
      isEqualToEmptyEditor(initialValue, event.beforeValue, schema)

    const editorIsEmpty =
      editor.snapshot.context.value.length === 1 &&
      isEqualToEmptyEditor(initialValue, editor.snapshot.context.value, schema)

    if (!event.isPatching) {
      return
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
          ...textPatch(editor.snapshot, operation, previousValue),
        ]
        break
      case 'remove_text':
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
      ['set', 'unset', 'remove_text'].includes(operation.type)
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
          operationId: event.undoStepId,
          value: editor.snapshot.context.value,
        })
      }
    }
  })

  return () => {
    unsubscribeBefore()
    unsubscribeAfter()
  }
}
