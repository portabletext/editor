import type {Patch} from '@portabletext/patches'
import {
  isSpan,
  isTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {withRemoteChanges} from '../engine-plugins/engine-plugin.remote-changes'
import {pluginWithoutHistory} from '../engine-plugins/engine-plugin.without-history'
import {withoutPatching} from '../engine-plugins/engine-plugin.without-patching'
import {normalize} from '../engine/editor/normalize'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {applySelect} from '../internal-utils/apply-selection'
import {createApplyPatch} from '../internal-utils/applyPatch'
import {debug} from '../internal-utils/debug'
import {safeStringify} from '../internal-utils/safe-json'
import {serializePath} from '../paths/serialize-path'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {Path} from '../types/paths'
import {
  blockOffsetToSpanSelectionPoint,
  spanSelectionPointToBlockOffset,
} from '../utils/util.block-offset'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorActor} from './editor-machine'

/**
 * Applies incoming remote patches to the editor. Registered on the
 * `subscriptions` array before `subscribeHistory`'s remote-rebase handler —
 * activation order is subscription order.
 */
export function setupRemotePatches({
  editorActor,
  subscriptions,
  editor,
}: {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
  editor: PortableTextEditorEngine
}): void {
  const applyPatch = createApplyPatch(editorActor.getSnapshot().context)

  let bufferedPatches: Patch[] = []

  const handleBufferedRemotePatches = () => {
    if (bufferedPatches.length === 0) {
      return
    }
    const patches = bufferedPatches
    bufferedPatches = []
    let changed = false

    const capturedSelection = captureSelectionForRecovery(editor)

    withRemoteChanges(editor, () => {
      withoutNormalizing(editor, () => {
        withoutPatching(editor, () => {
          pluginWithoutHistory(editor, () => {
            for (const patch of patches) {
              try {
                changed = applyPatch(editor, patch)

                if (debug.syncPatch.enabled) {
                  if (changed) {
                    debug.syncPatch(`(applied) ${safeStringify(patch, 2)}`)
                  } else {
                    debug.syncPatch(`(ignored) ${safeStringify(patch, 2)}`)
                  }
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
        recoverSelectionAfterRemotePatches(editor, capturedSelection)
        editor.onChange()
      }
    })
  }

  const handlePatches = ({patches}: {patches: Patch[]}) => {
    const remotePatches = patches.filter((patch) => patch.origin !== 'local')
    if (remotePatches.length === 0) {
      return
    }
    bufferedPatches = bufferedPatches.concat(remotePatches)
    handleBufferedRemotePatches()
  }

  subscriptions.push(() => {
    debug.syncPatch('subscribing to remote patches')
    const subscription = editorActor.on('patches', handlePatches)
    return () => {
      debug.syncPatch('unsubscribing to remote patches')
      subscription.unsubscribe()
    }
  })
}

type CapturedSelectionPoint = {
  spanKey: string
  spanText: string
  spanOffset: number
  blockPathKey: string
  blockOffset: BlockOffset
  blockText: string
  previousSiblingBlock:
    | {
        path: Path
        text: string
      }
    | undefined
  nextSiblingBlockPathKey: string | undefined
}

type CapturedSelection = {
  anchor: CapturedSelectionPoint | undefined
  focus: CapturedSelectionPoint | undefined
}

/**
 * Remote patches carry state deltas, not position mappings: a collaborator's
 * span merge or block merge arrives as delete + insert, so the generic
 * per-op selection transforms collapse the local caret to a boundary
 * instead of following the content. Capture enough identity before the
 * batch (leaf key, offset within the leaf, and the caret's position
 * expressed as a character offset in the block's text) to re-resolve the
 * caret afterwards when, and only when, the mapping is exact.
 */
function captureSelectionForRecovery(
  editor: Pick<PortableTextEditorEngine, 'snapshot'>,
): CapturedSelection | undefined {
  const selection = editor.snapshot.context.selection

  if (!selection) {
    return undefined
  }

  return {
    anchor: captureSelectionPoint(editor, selection.anchor),
    focus: captureSelectionPoint(editor, selection.focus),
  }
}

function captureSelectionPoint(
  editor: Pick<PortableTextEditorEngine, 'snapshot'>,
  selectionPoint: EditorSelectionPoint,
): CapturedSelectionPoint | undefined {
  const spanSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(spanSegment)) {
    return undefined
  }

  const blockOffset = spanSelectionPointToBlockOffset({
    snapshot: editor.snapshot,
    selectionPoint,
  })

  if (!blockOffset) {
    return undefined
  }

  const blockEntry = getNode(editor.snapshot, blockOffset.path)

  if (!blockEntry || !isTextBlock(editor.snapshot.context, blockEntry.node)) {
    return undefined
  }

  const spanEntry = getNode(editor.snapshot, selectionPoint.path)

  if (!spanEntry || !isSpan(editor.snapshot.context, spanEntry.node)) {
    return undefined
  }

  // Merges only ever move content into the previous sibling (see
  // `applyMergeNode`), so the previous sibling's identity and text are the
  // only neighborhood needed to recover from a remote block merge.
  const previousSibling = getSibling(editor.snapshot, blockOffset.path, {
    direction: 'previous',
  })
  const previousSiblingBlock =
    previousSibling &&
    isTextBlock(editor.snapshot.context, previousSibling.node)
      ? {
          path: previousSibling.path,
          text: getConcatenatedSpanText(editor, previousSibling.node),
        }
      : undefined

  // A remote split moves the block's tail into a freshly inserted next
  // sibling. Remembering who the next sibling was at capture time is what
  // distinguishes "a new block appeared holding my tail" from "my tail was
  // deleted and the old next sibling coincidentally matches it".
  const nextSibling = getSibling(editor.snapshot, blockOffset.path, {
    direction: 'next',
  })

  return {
    spanKey: spanSegment._key,
    spanText: spanEntry.node.text,
    spanOffset: selectionPoint.offset,
    blockPathKey: serializePath(blockOffset.path),
    blockOffset,
    blockText: getConcatenatedSpanText(editor, blockEntry.node),
    previousSiblingBlock,
    nextSiblingBlockPathKey: nextSibling
      ? serializePath(nextSibling.path)
      : undefined,
  }
}

function recoverSelectionAfterRemotePatches(
  editor: PortableTextEditorEngine,
  capturedSelection: CapturedSelection | undefined,
): void {
  if (!capturedSelection) {
    return
  }

  const selection = editor.snapshot.context.selection

  if (!selection) {
    return
  }

  const anchor = recoverSelectionPoint(
    editor,
    selection.anchor,
    capturedSelection.anchor,
  )
  const focus = recoverSelectionPoint(
    editor,
    selection.focus,
    capturedSelection.focus,
  )

  if (anchor === selection.anchor && focus === selection.focus) {
    return
  }

  applySelect(editor, {anchor, focus})
}

function recoverSelectionPoint(
  editor: PortableTextEditorEngine,
  currentPoint: EditorSelectionPoint,
  capturedPoint: CapturedSelectionPoint | undefined,
): EditorSelectionPoint {
  if (!capturedPoint) {
    return currentPoint
  }

  const currentSpanSegment = currentPoint.path.at(-1)
  const currentBlockOffset = isKeyedSegment(currentSpanSegment)
    ? spanSelectionPointToBlockOffset({
        snapshot: editor.snapshot,
        selectionPoint: currentPoint,
      })
    : undefined

  if (
    isKeyedSegment(currentSpanSegment) &&
    currentSpanSegment._key === capturedPoint.spanKey &&
    currentBlockOffset &&
    serializePath(currentBlockOffset.path) === capturedPoint.blockPathKey
  ) {
    const splitPoint = recoverSplitTail(editor, capturedPoint)

    if (splitPoint) {
      return splitPoint
    }

    // The caret is still inside the leaf it started in, under the same
    // block. The per-op transforms handled any text shifts (remote typing
    // arrives as offset-precise ops via `diffMatchPatch` replay), so their
    // result is trusted.
    return currentPoint
  }

  // Splitting a block reuses the span's `_key` in the new block, so
  // documents routinely contain doc-wide duplicate span keys and a key
  // match alone proves nothing. The search is therefore scoped to where a
  // merge can actually move the caret's span (its own block and the
  // previous sibling) and requires the span's text to match too.
  const spanMatches = [
    findSpanInBlock(editor, capturedPoint.blockOffset.path, capturedPoint),
    capturedPoint.previousSiblingBlock
      ? findSpanInBlock(
          editor,
          capturedPoint.previousSiblingBlock.path,
          capturedPoint,
        )
      : undefined,
  ].filter((match) => match !== undefined)

  if (spanMatches.length === 1) {
    // The leaf survived but moved to the previous sibling (a remote block
    // merge moves children with their keys intact).
    return spanMatches[0]!
  }

  if (spanMatches.length === 0) {
    const blockEntry = getNode(editor.snapshot, capturedPoint.blockOffset.path)

    if (
      blockEntry &&
      isTextBlock(editor.snapshot.context, blockEntry.node) &&
      getConcatenatedSpanText(editor, blockEntry.node) ===
        capturedPoint.blockText
    ) {
      // The leaf is gone but the block's text is unchanged: a remote span
      // merge absorbed the leaf into a sibling. The caret's character
      // position within the block maps exactly onto the merged spans.
      const spanPoint = blockOffsetToSpanSelectionPoint({
        snapshot: editor.snapshot,
        blockOffset: capturedPoint.blockOffset,
        direction: 'forward',
      })

      if (spanPoint) {
        return spanPoint
      }
    }

    const previousSiblingBlock = capturedPoint.previousSiblingBlock
    const previousBlockEntry = previousSiblingBlock
      ? getNode(editor.snapshot, previousSiblingBlock.path)
      : undefined

    if (
      !blockEntry &&
      previousSiblingBlock &&
      previousBlockEntry &&
      isTextBlock(editor.snapshot.context, previousBlockEntry.node) &&
      getConcatenatedSpanText(editor, previousBlockEntry.node) ===
        previousSiblingBlock.text + capturedPoint.blockText
    ) {
      // The caret's block is gone and the previous sibling's text is now
      // exactly the concatenation of the two blocks' texts: a remote block
      // merge (followed by their normalizer's span merge, which is why the
      // span key search found nothing). The caret's character position
      // maps exactly, shifted by the previous block's original text.
      const spanPoint = blockOffsetToSpanSelectionPoint({
        snapshot: editor.snapshot,
        blockOffset: {
          path: previousSiblingBlock.path,
          offset:
            previousSiblingBlock.text.length + capturedPoint.blockOffset.offset,
        },
        direction: 'forward',
      })

      if (spanPoint) {
        return spanPoint
      }
    }
  }

  // Ambiguous or inexact: any further recovery would be guesswork, so the
  // generic transform's boundary collapse stands.
  return currentPoint
}

/**
 * A remote split truncates the caret's block and moves the tail into a
 * newly inserted next sibling. When the caret sat inside the moved tail,
 * the generic transforms clamp it to the truncated block's end; the exact
 * position is in the new block, shifted by the kept prefix's length. The
 * mapping only applies when it is exact: the old block text must be
 * precisely the kept text plus the new sibling's text, the sibling must
 * not have existed at capture time, and the caret must have sat past the
 * kept prefix.
 */
function recoverSplitTail(
  editor: Pick<PortableTextEditorEngine, 'snapshot'>,
  capturedPoint: CapturedSelectionPoint,
): EditorSelectionPoint | undefined {
  const blockEntry = getNode(editor.snapshot, capturedPoint.blockOffset.path)

  if (!blockEntry || !isTextBlock(editor.snapshot.context, blockEntry.node)) {
    return undefined
  }

  const keptText = getConcatenatedSpanText(editor, blockEntry.node)

  if (capturedPoint.blockOffset.offset <= keptText.length) {
    return undefined
  }

  const nextSibling = getSibling(editor.snapshot, blockEntry.path, {
    direction: 'next',
  })

  if (
    !nextSibling ||
    !isTextBlock(editor.snapshot.context, nextSibling.node) ||
    serializePath(nextSibling.path) === capturedPoint.nextSiblingBlockPathKey
  ) {
    return undefined
  }

  if (
    keptText + getConcatenatedSpanText(editor, nextSibling.node) !==
    capturedPoint.blockText
  ) {
    return undefined
  }

  return blockOffsetToSpanSelectionPoint({
    snapshot: editor.snapshot,
    blockOffset: {
      path: nextSibling.path,
      offset: capturedPoint.blockOffset.offset - keptText.length,
    },
    direction: 'forward',
  })
}

function findSpanInBlock(
  editor: Pick<PortableTextEditorEngine, 'snapshot'>,
  blockPath: Path,
  capturedPoint: CapturedSelectionPoint,
): EditorSelectionPoint | undefined {
  const blockEntry = getNode(editor.snapshot, blockPath)

  if (!blockEntry || !isTextBlock(editor.snapshot.context, blockEntry.node)) {
    return undefined
  }

  for (const child of blockEntry.node.children) {
    if (
      isSpan(editor.snapshot.context, child) &&
      child._key === capturedPoint.spanKey &&
      child.text === capturedPoint.spanText
    ) {
      return {
        path: [...blockEntry.path, 'children', {_key: child._key}],
        offset: Math.min(capturedPoint.spanOffset, child.text.length),
      }
    }
  }

  return undefined
}

function getConcatenatedSpanText(
  editor: Pick<PortableTextEditorEngine, 'snapshot'>,
  block: PortableTextTextBlock,
): string {
  let text = ''

  for (const child of block.children) {
    if (isSpan(editor.snapshot.context, child)) {
      text += child.text
    }
  }

  return text
}
