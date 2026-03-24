import {insert, setIfMissing, unset, type Patch} from '@portabletext/patches'
import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import type {EditorContext} from '../editor/editor-snapshot'
import type {RelayActor} from '../editor/relay-machine'
import {createUndoSteps} from '../editor/undo-step'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {debug} from '../internal-utils/debug'
import {
  insertNodePatch,
  insertTextPatch,
  removeNodePatch,
  removeTextPatch,
  setNodePatch,
} from '../internal-utils/operation-to-patches'
import {safeStringify} from '../internal-utils/safe-json'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import {getSpanNode} from '../node-traversal/get-span-node'
import {applyOperation} from '../slate/core/apply-operation'
import {isBatchingDirtyPaths} from '../slate/core/batch-dirty-paths'
import {updateDirtyPaths} from '../slate/core/update-dirty-paths'
import {
  transformPendingPoint,
  transformPendingRange,
  transformTextDiff,
  type TextDiff,
} from '../slate/dom/utils/diff-text'
import {isEditor} from '../slate/editor/is-editor'
import {normalize} from '../slate/editor/normalize'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Operation} from '../slate/interfaces/operation'
import type {Path} from '../slate/interfaces/path'
import {PathRef} from '../slate/interfaces/path-ref'
import {PointRef} from '../slate/interfaces/point-ref'
import {operationCanTransformPath} from '../slate/path/operation-can-transform-path'
import {transformPath} from '../slate/path/transform-path'
import {isPoint} from '../slate/point/is-point'
import {transformRangeRef} from '../slate/range-ref/transform-range-ref'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withRemoteChanges} from './slate-plugin.remote-changes'
import {pluginWithoutHistory} from './slate-plugin.without-history'
import {withoutPatching} from './slate-plugin.without-patching'

const UNDO_STEP_LIMIT = 1000

interface ApplyPluginOptions {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export function setupApply(
  editor: PortableTextSlateEditor,
  {editorActor, relayActor, subscriptions}: ApplyPluginOptions,
) {
  const context = editorActor.getSnapshot().context
  let previousUndoStepId = editor.undoStepId
  let bufferedPatches: Patch[] = []

  const applyPatch = createApplyPatch(context)

  // --- History: subscribe to remote patches for rebasing ---
  let previousSnapshot: Array<PortableTextBlock> | undefined = editor.children

  subscriptions.push(() => {
    const subscription = editorActor.on('patches', ({patches, snapshot}) => {
      let reset = false

      for (const patch of patches) {
        if (reset) {
          continue
        }

        if (patch.origin === 'local') {
          continue
        }

        if (patch.type === 'unset' && patch.path.length === 0) {
          editor.history = {undos: [], redos: []}
          editor.remotePatches.splice(0, editor.remotePatches.length)
          editor.withHistory = true
          reset = true
          return
        }

        editor.remotePatches.push({
          patch,
          time: new Date(),
          snapshot,
          previousSnapshot,
        })
      }

      previousSnapshot = snapshot
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  // --- Patches: subscribe to remote patches for applying ---
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

  // --- The unified apply function ---
  editor.apply = (operation: Operation) => {
    const isLocalForwardOp =
      !editor.isProcessingRemoteChanges &&
      !editor.isUndoing &&
      !editor.isRedoing

    // Phase 1: Transform pending DOM state (from withDom)
    if (editor.pendingDiffs?.length) {
      const transformed = editor.pendingDiffs
        .map((textDiff) => transformTextDiff(textDiff, operation))
        .filter(Boolean) as TextDiff[]
      editor.pendingDiffs = transformed
    }

    if (editor.pendingSelection) {
      editor.pendingSelection = transformPendingRange(
        editor,
        editor.pendingSelection,
        operation,
      )
    }

    if (editor.pendingAction?.at) {
      const at = isPoint(editor.pendingAction.at)
        ? transformPendingPoint(editor, editor.pendingAction.at, operation)
        : transformPendingRange(editor, editor.pendingAction.at, operation)
      editor.pendingAction = at ? {...editor.pendingAction, at} : null
    }

    if (operation.type === 'set_selection') {
      editor.userSelection?.unref()
      editor.userSelection = null
    }

    // Phase 2: Transform refs (from core apply)
    for (const ref of editor.pathRefs) {
      PathRef.transform(ref, operation)
    }

    for (const ref of editor.pointRefs) {
      PointRef.transform(ref, operation)
    }

    for (const ref of editor.rangeRefs) {
      transformRangeRef(ref, operation)
    }

    // Phase 3: Update dirty paths (from core apply)
    if (!isBatchingDirtyPaths(editor)) {
      const transform = operationCanTransformPath(operation)
        ? (p: Path) => transformPath(p, operation)
        : undefined
      updateDirtyPaths(editor, editor.getDirtyPaths(operation), transform)
    }

    // Phase 4: Unique key generation for insert_node (from uniqueKeys plugin)
    let op = operation
    if (op.type === 'insert_node' && isLocalForwardOp) {
      if (!isEditor(op.node)) {
        const _key =
          op.node._key &&
          keyExistsAtPath(
            {
              blockIndexMap: editor.blockIndexMap,
              context: {
                schema: context.schema,
                value: editor.children,
              },
            },
            op.path,
            op.node._key,
          )
            ? undefined
            : op.node._key

        op = {
          ...op,
          node: {
            ...op.node,
            _key:
              _key === undefined
                ? editorActor.getSnapshot().context.keyGenerator()
                : _key,
          },
        }
      }
    }

    // Phase 5: Record history (from history plugin)
    // Must happen before applyOperation so we capture the op with the correct key
    if (isLocalForwardOp) {
      if (
        !editorActor.getSnapshot().matches({'edit mode': 'read only'}) &&
        editor.withHistory
      ) {
        if (op.type !== 'set_selection') {
          editor.history.redos = []
        }

        const currentUndoStepId = editor.undoStepId

        editor.history.undos = createUndoSteps({
          steps: editor.history.undos,
          op,
          editor,
          currentUndoStepId,
          previousUndoStepId,
        })

        while (editor.history.undos.length > UNDO_STEP_LIMIT) {
          editor.history.undos.shift()
        }

        previousUndoStepId = currentUndoStepId
      } else {
        previousUndoStepId = editor.undoStepId
      }
    }

    // Phase 6: Capture previous value for patches (from patches plugin)
    const prevValueForPatches = editor.children
    const editorWasEmpty = isEqualToEmptyEditor(
      editorActor.getSnapshot().context.initialValue,
      prevValueForPatches,
      editorActor.getSnapshot().context.schema,
    )

    // Phase 7: Apply the tree mutation (from core apply)
    if (editor.isNormalizingNode) {
      debug.normalization(`(slate operation)\n${safeStringify(op, 2)}`)
    }
    applyOperation(editor, op)

    // Phase 8: Rebuild index maps (from updateValue plugin)
    if (
      op.type !== 'set_selection' &&
      op.type !== 'insert_text' &&
      op.type !== 'remove_text'
    ) {
      buildIndexMaps(
        {
          schema: context.schema,
          value: editor.children,
        },
        {
          blockIndexMap: editor.blockIndexMap,
          listIndexMap: editor.listIndexMap,
        },
      )
    }

    // Phase 9: Emit patches (from patches plugin)
    if (editor.isPatching) {
      const editorIsEmpty = isEqualToEmptyEditor(
        editorActor.getSnapshot().context.initialValue,
        editor.children,
        editorActor.getSnapshot().context.schema,
      )

      let patches: Patch[] = []

      if (editorWasEmpty && !editorIsEmpty && op.type !== 'set_selection') {
        patches.push(insert(prevValueForPatches, 'before', [0]))
      }

      switch (op.type) {
        case 'insert_text':
          patches = [
            ...patches,
            ...insertTextPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              op,
              prevValueForPatches,
            ),
          ]
          break
        case 'remove_text':
          patches = [
            ...patches,
            ...removeTextPatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              op,
              prevValueForPatches,
            ),
          ]
          break
        case 'remove_node':
          patches = [
            ...patches,
            ...removeNodePatch(
              editorActor.getSnapshot().context.schema,
              prevValueForPatches,
              op,
            ),
          ]
          break
        case 'insert_node':
          patches = [
            ...patches,
            ...insertNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              op,
              prevValueForPatches,
            ),
          ]
          break
        case 'set_node':
          patches = [
            ...patches,
            ...setNodePatch(
              editorActor.getSnapshot().context.schema,
              editor.children,
              op,
            ),
          ]
          break
        default:
        // Do nothing
      }

      if (
        !editorWasEmpty &&
        editorIsEmpty &&
        ['set_node', 'remove_text', 'remove_node'].includes(op.type)
      ) {
        patches = [...patches, unset([])]
        relayActor.send({
          type: 'unset',
          previousValue: prevValueForPatches,
        })
      }

      if (editorWasEmpty && patches.length > 0) {
        patches = [setIfMissing([], []), ...patches]
      }

      if (patches.length > 0) {
        for (const patch of patches) {
          editorActor.send({
            type: 'internal.patch',
            patch: {...patch, origin: 'local'},
            operationId: editor.undoStepId,
            value: editor.children,
          })
        }
      }
    }

    // Phase 10: Track operations + normalize (from core apply)
    editor.operations.push(op)
    normalize(editor, {operation: op})

    // Phase 11: Clear decorator state on selection change (from normalization plugin)
    if (op.type === 'set_selection' && isLocalForwardOp) {
      if (
        op.properties &&
        op.newProperties &&
        op.properties.anchor &&
        op.properties.focus &&
        op.newProperties.anchor &&
        op.newProperties.focus
      ) {
        const previousSelectionIsCollapsed = isCollapsedRange({
          anchor: op.properties.anchor,
          focus: op.properties.focus,
        })
        const newSelectionIsCollapsed = isCollapsedRange({
          anchor: op.newProperties.anchor,
          focus: op.newProperties.focus,
        })

        if (previousSelectionIsCollapsed && newSelectionIsCollapsed) {
          const focusSpanEntry = getSpanNode(editor, op.properties.focus.path)
          const focusSpan: PortableTextSpan | undefined = focusSpanEntry?.node
          const newFocusSpanEntry = getSpanNode(
            editor,
            op.newProperties.focus.path,
          )
          const newFocusSpan: PortableTextSpan | undefined =
            newFocusSpanEntry?.node
          const movedToNextSpan =
            focusSpan &&
            newFocusSpan &&
            op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
            op.newProperties.focus.path[1] ===
              op.properties.focus.path[1]! + 1 &&
            focusSpan.text.length === op.properties.focus.offset &&
            op.newProperties.focus.offset === 0
          const movedToPreviousSpan =
            focusSpan &&
            newFocusSpan &&
            op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
            op.newProperties.focus.path[1] ===
              op.properties.focus.path[1]! - 1 &&
            op.properties.focus.offset === 0 &&
            newFocusSpan.text.length === op.newProperties.focus.offset

          if (!movedToNextSpan && !movedToPreviousSpan) {
            editor.decoratorState = {}
          }
        }
      } else {
        editor.decoratorState = {}
      }
    }

    // Phase 12: Clear marks on selection change (from core apply)
    if (op.type === 'set_selection') {
      editor.marks = null
    }

    // Phase 13: DOM dirty flag (from withDom)
    switch (op.type) {
      case 'insert_node':
      case 'remove_node':
      case 'insert_text':
      case 'remove_text':
      case 'set_selection': {
        editor.isNodeMapDirty = true
      }
    }

    // Phase 14: Schedule onChange microtask (from core apply)
    if (!editor.flushing) {
      editor.flushing = true

      Promise.resolve().then(() => {
        editor.flushing = false
        editor.onChange({operation: op})
        editor.operations = []
      })
    }
  }
}

function keyExistsAtPath(
  snapshot: {
    blockIndexMap: Map<string, number>
    context: Pick<EditorContext, 'schema' | 'value'>
  },
  path: Path,
  key: string,
): boolean {
  if (path.length === 1) {
    return snapshot.blockIndexMap.has(key)
  }

  if (path.length > 2) {
    return false
  }

  const parentBlockIndex = path.at(0)
  const parentBlock =
    parentBlockIndex !== undefined
      ? snapshot.context.value.at(parentBlockIndex)
      : undefined

  if (!parentBlock) {
    return false
  }

  if (!isTextBlock(snapshot.context, parentBlock)) {
    return false
  }

  return parentBlock.children.some((child) => child._key === key)
}
