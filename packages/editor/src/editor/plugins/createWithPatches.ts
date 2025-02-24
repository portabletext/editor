import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import {
  Editor,
  type Descendant,
  type InsertNodeOperation,
  type InsertTextOperation,
  type MergeNodeOperation,
  type MoveNodeOperation,
  type Operation,
  type RemoveNodeOperation,
  type RemoveTextOperation,
  type SetNodeOperation,
  type SplitNodeOperation,
} from 'slate'
import {createApplyPatch} from '../../internal-utils/applyPatch'
import {debugWithName} from '../../internal-utils/debug'
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
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {getCurrentActionId} from '../with-applying-behavior-actions'
import {withoutSaving} from './createWithUndoRedo'

const debug = debugWithName('plugin:withPatches')
const debugVerbose = false

export interface PatchFunctions {
  insertNodePatch: (
    editor: PortableTextSlateEditor,
    operation: InsertNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  insertTextPatch: (
    editor: PortableTextSlateEditor,
    operation: InsertTextOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  mergeNodePatch: (
    editor: PortableTextSlateEditor,
    operation: MergeNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  moveNodePatch: (
    editor: PortableTextSlateEditor,
    operation: MoveNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  removeNodePatch: (
    editor: PortableTextSlateEditor,
    operation: RemoveNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  removeTextPatch: (
    editor: PortableTextSlateEditor,
    operation: RemoveTextOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  setNodePatch: (
    editor: PortableTextSlateEditor,
    operation: SetNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
  splitNodePatch: (
    editor: PortableTextSlateEditor,
    operation: SplitNodeOperation,
    previousChildren: Descendant[],
  ) => Patch[]
}

interface Options {
  editorActor: EditorActor
  patchFunctions: PatchFunctions
  schemaTypes: PortableTextMemberSchemaTypes
  subscriptions: Array<() => () => void>
}

export function createWithPatches({
  editorActor,
  patchFunctions,
  schemaTypes,
  subscriptions,
}: Options): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  // The previous editor children are needed to figure out the _key of deleted nodes
  // The editor.children would no longer contain that information if the node is already deleted.
  let previousChildren: Descendant[]

  const applyPatch = createApplyPatch(schemaTypes)

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
              patches.forEach((patch) => {
                if (debug.enabled)
                  debug(`Handling remote patch ${JSON.stringify(patch)}`)
                changed = applyPatch(editor, patch)
              })
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

      const editorWasEmpty = isEqualToEmptyEditor(previousChildren, schemaTypes)

      // Apply the operation
      apply(operation)

      const editorIsEmpty = isEqualToEmptyEditor(editor.children, schemaTypes)

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
            ...patchFunctions.insertTextPatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'remove_text':
          patches = [
            ...patches,
            ...patchFunctions.removeTextPatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'remove_node':
          patches = [
            ...patches,
            ...patchFunctions.removeNodePatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'split_node':
          patches = [
            ...patches,
            ...patchFunctions.splitNodePatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'insert_node':
          patches = [
            ...patches,
            ...patchFunctions.insertNodePatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'set_node':
          patches = [
            ...patches,
            ...patchFunctions.setNodePatch(editor, operation, previousChildren),
          ]
          break
        case 'merge_node':
          patches = [
            ...patches,
            ...patchFunctions.mergeNodePatch(
              editor,
              operation,
              previousChildren,
            ),
          ]
          break
        case 'move_node':
          patches = [
            ...patches,
            ...patchFunctions.moveNodePatch(
              editor,
              operation,
              previousChildren,
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
        editorActor.send({
          type: 'notify.unset',
          previousValue: fromSlateValue(
            previousChildren,
            schemaTypes.block.name,
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
            actionId: getCurrentActionId(editor),
            value: fromSlateValue(
              editor.children,
              schemaTypes.block.name,
              KEY_TO_VALUE_ELEMENT.get(editor),
            ),
          })
        }
      }
      return editor
    }
    return editor
  }
}
