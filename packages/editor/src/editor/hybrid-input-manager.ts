import type {PortableTextBlock} from '@portabletext/schema'
import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {Path, Range, Transforms} from '../slate'
import {getSelection, isTrackedMutation} from '../slate-dom'
import {ReactEditor} from '../slate-react/plugin/react-editor'
import type {DebouncedFunc} from '../slate-react/utils/debounce'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {parseDOMToPortableText} from './dom-parser'
import type {EditorActor} from './editor-machine'
import {detectChange} from './pt-change-detector'
import {ptChangeToBehaviorEvent} from './pt-change-to-behavior-event'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Delay after compositionEnd before flushing — some IMEs fire compositionEnd
// before the final insertText, so we wait briefly to let the browser settle.
const COMPOSITION_RESOLVE_DELAY = 25

// Time with no user interaction before the current action is considered done.
const FLUSH_DELAY = 200

// ---------------------------------------------------------------------------
// Debug buffer — writes to an in-memory circular buffer that the playground
// debug panel can subscribe to. Replaces console.log for on-device debugging
// (Android can't open DevTools).
// ---------------------------------------------------------------------------

export interface HybridDebugEntry {
  timestamp: number
  inputType: string
  cancelable: boolean
  path: 'fast' | 'slow' | 'composition' | 'insertReplacementText' | 'flush'
  detail: string
}

export const hybridDebugLog: HybridDebugEntry[] = []
const MAX_DEBUG_ENTRIES = 50

const debugListeners = new Set<() => void>()

function debugLog(entry: Omit<HybridDebugEntry, 'timestamp'>): void {
  hybridDebugLog.push({...entry, timestamp: Date.now()})
  if (hybridDebugLog.length > MAX_DEBUG_ENTRIES) {
    hybridDebugLog.shift()
  }
  for (const listener of debugListeners) {
    listener()
  }
}

export function onHybridDebug(listener: () => void): () => void {
  debugListeners.add(listener)
  return () => {
    debugListeners.delete(listener)
  }
}

// ---------------------------------------------------------------------------
// Delete inputType → behavior event mapping table
// Avoids a verbose switch statement. Each entry maps an inputType to the
// behavior event shape that should be fired for collapsed selections.
// Expanded selections are handled separately by the expanded selection guard.
// ---------------------------------------------------------------------------

const DELETE_INPUT_TYPE_MAP: Record<
  string,
  | {type: 'delete'; direction: 'forward'}
  | {type: 'delete.forward'; unit: 'character' | 'word' | 'line' | 'block'}
  | {type: 'delete.backward'; unit: 'character' | 'word' | 'line' | 'block'}
> = {
  deleteByComposition: {type: 'delete', direction: 'forward'},
  deleteByCut: {type: 'delete', direction: 'forward'},
  deleteByDrag: {type: 'delete', direction: 'forward'},
  deleteContent: {type: 'delete.forward', unit: 'character'},
  deleteContentForward: {type: 'delete.forward', unit: 'character'},
  deleteContentBackward: {type: 'delete.backward', unit: 'character'},
  deleteHardLineBackward: {type: 'delete.backward', unit: 'block'},
  deleteSoftLineBackward: {type: 'delete.backward', unit: 'line'},
  deleteHardLineForward: {type: 'delete.forward', unit: 'block'},
  deleteSoftLineForward: {type: 'delete.forward', unit: 'line'},
  deleteWordBackward: {type: 'delete.backward', unit: 'word'},
  deleteWordForward: {type: 'delete.forward', unit: 'word'},
}

// ---------------------------------------------------------------------------
// Type guard for text blocks with children
// ---------------------------------------------------------------------------

const isDataTransfer = (value: any): value is DataTransfer =>
  value?.constructor?.name === 'DataTransfer'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CreateHybridInputManagerOptions = {
  editor: PortableTextSlateEditor
  editorActor: EditorActor
  editorRef: React.RefObject<HTMLElement>
  scheduleOnDOMSelectionChange: DebouncedFunc<() => void>
  onDOMSelectionChange: DebouncedFunc<() => void>
}

export type HybridInputManager = {
  flush: () => void
  scheduleFlush: () => void
  hasPendingDiffs: () => boolean
  hasPendingAction: () => boolean
  hasPendingChanges: () => boolean
  isFlushing: () => boolean | 'action'
  handleUserSelect: (range: Range | null) => void
  handleCompositionEnd: (event: CompositionEvent) => void
  handleCompositionStart: (event: CompositionEvent) => void
  handleDOMBeforeInput: (event: InputEvent) => void
  handleKeyDown: (event: KeyboardEvent) => void
  handleDomMutations: (mutations: MutationRecord[]) => void
  handleInput: () => void
  drainPendingMutations: (() => void) | null
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Check if a selection spans different leaf nodes (spans). A cross-boundary
 * selection has anchor and focus in different spans — e.g., starting in a
 * plain text span and ending inside an annotation span.
 */
function isCrossBoundarySelection(selection: Range): boolean {
  return !Path.equals(selection.anchor.path, selection.focus.path)
}

export function createHybridInputManager({
  editor,
  editorActor,
  editorRef,
  scheduleOnDOMSelectionChange,
  onDOMSelectionChange,
}: CreateHybridInputManagerOptions): HybridInputManager {
  let flushing: 'action' | boolean = false
  let compositionEndTimeoutId: ReturnType<typeof setTimeout> | null = null
  let flushTimeoutId: ReturnType<typeof setTimeout> | null = null
  let actionTimeoutId: ReturnType<typeof setTimeout> | null = null

  let pendingAction = false
  let isComposing = false
  let isSlowPath = false
  let mutatedNodes = new Set<Node>()
  let lastKnownBlocks: PortableTextBlock[] = []
  let drainPendingMutations: (() => void) | null = null

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function snapshotBlocks(): PortableTextBlock[] {
    return [...(editor.children as Array<PortableTextBlock>)]
  }

  function getCurrentCursorOffset(): number | undefined {
    const {selection} = editor
    if (selection && Range.isCollapsed(selection)) {
      return selection.anchor.offset
    }
    return undefined
  }

  /**
   * Set the editor selection from a mapping result's selectionBefore hint.
   * The hint expresses selection as {blockKey, offset} — we convert to a
   * Slate path via the editor's blockIndexMap.
   */
  function applySelectionHint(hint: {blockKey: string; offset: number}): void {
    const blockIndex = editor.blockIndexMap.get(hint.blockKey)
    if (blockIndex === undefined) {
      return
    }

    const block = (editor.children as Array<PortableTextBlock>)[blockIndex]
    if (!block || !('children' in block) || !Array.isArray(block.children)) {
      return
    }

    // Find the correct child span for the given offset
    let remainingOffset = hint.offset
    let childIndex = 0
    for (let i = 0; i < block.children.length; i++) {
      const child = block.children[i]
      if (!child || typeof child !== 'object') {
        continue
      }
      const text = 'text' in child ? String(child.text) : ''
      if (remainingOffset <= text.length) {
        childIndex = i
        break
      }
      remainingOffset -= text.length
      childIndex = i // fallback to last child
    }

    const path = [blockIndex, childIndex]
    try {
      const point = {path, offset: remainingOffset}
      const range = {anchor: point, focus: point}
      if (!editor.selection || !Range.equals(editor.selection, range)) {
        Transforms.select(editor, range)
      }
    } catch {
      debugLog({
        inputType: 'applySelectionHint',
        cancelable: false,
        path: 'flush',
        detail: `invalid path [${path}] hint=${JSON.stringify(hint)}`,
      })
    }
  }

  /**
   * Determine the text block type name from the editor's first block.
   * Falls back to 'block' which is the standard PT text block type.
   */
  function getTextBlockType(): string {
    const firstBlock = (editor.children as Array<PortableTextBlock>)[0]
    if (
      firstBlock &&
      'children' in firstBlock &&
      editor.isTextBlock(firstBlock)
    ) {
      return firstBlock._type
    }
    return 'block'
  }

  function send(behaviorEvent: BehaviorEvent): void {
    editorActor.send({type: 'behavior event', behaviorEvent, editor})
  }

  /**
   * Walk up from a mutated node to the nearest block-level element,
   * adding each ancestor to the mutatedNodes set. This tells the DOM
   * parser which subtrees need full re-parsing vs. WeakMap fast-path.
   */
  function addMutatedNodeAncestors(node: Node): void {
    mutatedNodes.add(node)
    let parent = node instanceof HTMLElement ? node : node.parentElement
    while (parent && parent.getAttribute('data-slate-node') !== 'element') {
      mutatedNodes.add(parent)
      parent = parent.parentElement
    }
    if (parent) {
      mutatedNodes.add(parent)
    }
  }

  // -------------------------------------------------------------------------
  // Fast path: inputType → behavior event mapping
  // -------------------------------------------------------------------------

  /**
   * Try to handle a beforeinput event via the fast path (preventDefault +
   * immediate behavior event). Returns true if handled, false if the caller
   * should fall through to the slow path (parse-and-diff).
   */
  function tryFastPath(event: InputEvent): boolean {
    const inputType = event.inputType

    // Structural events (Enter, Shift+Enter) always use the fast path,
    // even during composition. On slower environments (CI), Firefox may
    // fire compositionstart before insertParagraph, but the block split
    // must still go through the behavior system.
    if (inputType === 'insertParagraph' && event.cancelable) {
      event.preventDefault()
      send({type: 'insert.break'})
      return true
    }

    if (inputType === 'insertLineBreak' && event.cancelable) {
      event.preventDefault()
      send({type: 'insert.soft break'})
      return true
    }

    if (!event.cancelable || isComposing) {
      return false
    }
    const {selection} = editor

    // History events are handled by handleNativeHistoryEvents in
    // editable.tsx (which runs before this handler). Just preventDefault
    // to stop the browser's native undo/redo.
    if (inputType === 'historyUndo' || inputType === 'historyRedo') {
      event.preventDefault()
      return true
    }

    // Composition events always use the slow path
    if (
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      return false
    }

    // Expanded selection guard: when the selection is expanded, all delete
    // variants collapse to a simple directional delete — the unit is
    // irrelevant because the selected content is what gets removed.
    if (
      selection &&
      Range.isExpanded(selection) &&
      inputType.startsWith('delete')
    ) {
      const direction = inputType.endsWith('Backward') ? 'backward' : 'forward'
      event.preventDefault()
      send({type: 'delete', direction})
      return true
    }

    // DataTransfer events must be handled immediately — the DataTransfer
    // object becomes inaccessible after the event handler returns.
    const data =
      (event as InputEvent & {dataTransfer?: DataTransfer}).dataTransfer ??
      event.data ??
      undefined

    if (
      inputType === 'insertFromPaste' ||
      inputType === 'insertFromDrop' ||
      inputType === 'insertFromYank' ||
      inputType === 'insertFromComposition'
    ) {
      event.preventDefault()

      // Safari fires insertFromComposition before compositionEnd
      if (inputType === 'insertFromComposition') {
        isComposing = false
        editor.composing = false
      }

      if (isDataTransfer(data)) {
        send({type: 'input.*', originEvent: {dataTransfer: data}})
      } else {
        send({type: 'insert.text', text: typeof data === 'string' ? data : ''})
      }
      return true
    }

    // Special case: deleteEntireSoftLine fires TWO events (backward then forward)
    if (inputType === 'deleteEntireSoftLine') {
      event.preventDefault()
      send({type: 'delete.backward', unit: 'line'})
      send({type: 'delete.forward', unit: 'line'})
      return true
    }

    // Delete events (collapsed selection) — use the lookup table.
    const deleteEvent = DELETE_INPUT_TYPE_MAP[inputType]
    if (deleteEvent) {
      // When Slate's selection is collapsed but the DOM selection is
      // expanded (e.g., after Ctrl+A where the selectionchange event
      // hasn't been processed yet), sync Slate's selection with the
      // browser's target range before processing the delete.
      // We check the DOM selection (not just the target range) to avoid
      // catching grapheme cluster deletion — where the target range is
      // expanded (covering all code points of the cluster) but the DOM
      // selection is collapsed at the cursor.
      if (
        (inputType === 'deleteContentBackward' ||
          inputType === 'deleteContentForward') &&
        selection &&
        Range.isCollapsed(selection) &&
        !editor.isNodeMapDirty
      ) {
        try {
          const root = ReactEditor.findDocumentOrShadowRoot(editor)
          const domSelection = getSelection(root)
          if (domSelection && !domSelection.isCollapsed) {
            // DOM selection is expanded but Slate's is collapsed — stale.
            // Use the target range to sync.
            const [nativeTargetRange] = event.getTargetRanges()
            if (nativeTargetRange) {
              const targetRange = ReactEditor.toSlateRange(
                editor,
                nativeTargetRange,
                {exactMatch: false, suppressThrow: true},
              )
              if (targetRange && Range.isExpanded(targetRange)) {
                event.preventDefault()
                Transforms.select(editor, targetRange)
                const direction = inputType.endsWith('Backward')
                  ? 'backward'
                  : 'forward'
                send({type: 'delete', direction})
                return true
              }
            }
          }
        } catch {
          // Ignore — proceed with normal delete handling
        }
      }
      event.preventDefault()
      send(deleteEvent)
      return true
    }

    // Text insertion
    if (inputType === 'insertText') {
      if (isDataTransfer(data)) {
        event.preventDefault()
        send({type: 'input.*', originEvent: {dataTransfer: data}})
        return true
      }

      event.preventDefault()
      send({type: 'insert.text', text: typeof data === 'string' ? data : ''})
      return true
    }

    return false
  }

  // -------------------------------------------------------------------------
  // Core methods
  // -------------------------------------------------------------------------

  const flush = (): void => {
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }
    if (actionTimeoutId) {
      clearTimeout(actionTimeoutId)
      actionTimeoutId = null
    }

    // Drain any pending MutationObserver records before parsing —
    // the observer callback is a microtask that may not have fired yet.
    drainPendingMutations?.()

    if (!pendingAction) {
      return
    }

    if (!flushing) {
      flushing = 'action'
      try {
        pendingAction = false

        const editorElement = editorRef.current
        if (!editorElement) {
          debugLog({
            inputType: 'flush',
            cancelable: false,
            path: 'flush',
            detail: 'no editor element',
          })
          mutatedNodes = new Set()
          isSlowPath = false
          return
        }

        // Parse-and-diff pipeline
        const oldBlocks = lastKnownBlocks

        // Use blocks captured at compositionEnd if available (they were
        // parsed before RestoreDOM reverted the DOM). Otherwise parse now.
        let newBlocks: PortableTextBlock[]
        if (compositionEndBlocks) {
          newBlocks = compositionEndBlocks
          compositionEndBlocks = null
        } else {
          newBlocks = parseDOMToPortableText(editorElement, {
            textBlockType: getTextBlockType(),
            elementToNode: editor.elementToNode,
            mutatedNodes,
          })
        }

        const cursorOffset = getCurrentCursorOffset()
        const change = detectChange(oldBlocks, newBlocks, cursorOffset)

        const oldTexts = oldBlocks.map((block) => {
          const children = 'children' in block ? block.children : []
          return Array.isArray(children)
            ? children
                .map((child) => ('text' in child ? child.text : ''))
                .join('')
            : ''
        })
        const newTexts = newBlocks.map((block) => {
          const children = 'children' in block ? block.children : []
          return Array.isArray(children)
            ? children
                .map((child) => ('text' in child ? child.text : ''))
                .join('')
            : ''
        })

        debugLog({
          inputType: 'flush',
          cancelable: false,
          path: 'flush',
          detail: `mutatedNodes=${mutatedNodes.size} parsed=${newBlocks.length} blocks old=[${oldTexts.map((t) => JSON.stringify(t)).join(',')}] new=[${newTexts.map((t) => JSON.stringify(t)).join(',')}] domText="${(editorElement.textContent ?? '').replace(/\uFEFF/g, '').slice(0, 100)}"`,
        })

        debugLog({
          inputType: 'flush',
          cancelable: false,
          path: 'flush',
          detail: `change=${change.type}${change.type !== 'no-change' ? ` ${JSON.stringify(change)}` : ''}`,
        })

        const mapping = ptChangeToBehaviorEvent(change, cursorOffset)

        debugLog({
          inputType: 'flush',
          cancelable: false,
          path: 'flush',
          detail: `events=[${mapping.events.map((e) => e.type).join(', ')}]${mapping.selectionBefore ? ` sel=${JSON.stringify(mapping.selectionBefore)}` : ''}`,
        })

        if (mapping.selectionBefore) {
          applySelectionHint(mapping.selectionBefore)
        }

        for (const behaviorEvent of mapping.events) {
          editorActor.send({type: 'behavior event', behaviorEvent, editor})
        }

        // Update snapshot for next diff cycle
        lastKnownBlocks = snapshotBlocks()
        mutatedNodes = new Set()
        isSlowPath = false

        scheduleOnDOMSelectionChange.flush()
        onDOMSelectionChange.flush()
      } finally {
        setTimeout(() => {
          flushing = false
        })
      }
    }
  }

  const scheduleFlush = (): void => {
    if (!actionTimeoutId) {
      actionTimeoutId = setTimeout(flush)
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleDOMBeforeInput = (event: InputEvent): void => {
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }

    // Note: when isNodeMapDirty is true, we skip getTargetRanges() processing
    // (the node map is stale so toSlateRange would fail) but still process
    // the event. The old code had the same pattern — only target range
    // processing was guarded, not the entire event handler.

    // Flush pending selection changes so Slate's selection is current
    // (IMEs and extensions like Grammarly set DOM selection before beforeinput)
    scheduleOnDOMSelectionChange.flush()
    onDOMSelectionChange.flush()

    const inputType = event.inputType

    // During composition, let the browser handle everything
    if (
      isComposing &&
      (inputType === 'insertCompositionText' ||
        inputType === 'deleteCompositionText')
    ) {
      return
    }

    // When insertText arrives during composition (after compositionEnd but
    // before the timeout clears isComposing), this is the composition's
    // final text commitment. Handle via the fast path so the behavior
    // system correctly processes cross-boundary selections (e.g., composing
    // across an annotation boundary). Cancel the composition timeout since
    // we're handling the result here.
    //
    // This works because editable.tsx no longer clears editor.composing in
    // its onCompositionEnd microtask — the hybrid input manager owns that
    // flag. So RestoreDOM hasn't reverted the composition DOM mutations,
    // and getTargetRanges() returns the correct insertion point.
    if (isComposing && inputType === 'insertText' && event.cancelable) {
      isComposing = false
      editor.composing = false
      compositionEndBlocks = null

      if (compositionEndTimeoutId) {
        clearTimeout(compositionEndTimeoutId)
        compositionEndTimeoutId = null
      }

      // Restore the selection from compositionStart. During composition
      // the browser may collapse a cross-boundary selection into one span
      // (e.g., placing composed text inside an annotation span even though
      // the original selection started outside it). getTargetRanges()
      // would report the browser's chosen position, not the original
      // cross-boundary selection. By restoring the original selection, the
      // behavior system correctly handles the cross-boundary deletion
      // before inserting the composed text.
      const savedSelection = compositionStartSelection
      compositionStartSelection = null

      if (savedSelection) {
        try {
          if (
            !editor.selection ||
            !Range.equals(editor.selection, savedSelection)
          ) {
            Transforms.select(editor, savedSelection)
          }
        } catch {
          // Selection may be invalid if the document changed — fall back
          // to getTargetRanges() below
        }
      }

      // If we couldn't restore the original selection (no saved selection
      // or it was invalid), fall back to getTargetRanges()
      if (!savedSelection && !editor.isNodeMapDirty) {
        const [nativeTargetRange] = event.getTargetRanges()
        if (nativeTargetRange) {
          try {
            const targetRange = ReactEditor.toSlateRange(
              editor,
              nativeTargetRange,
              {exactMatch: false, suppressThrow: true},
            )
            if (
              targetRange &&
              (!editor.selection ||
                !Range.equals(editor.selection, targetRange))
            ) {
              Transforms.select(editor, targetRange)
            }
          } catch {
            // Ignore — proceed with current selection
          }
        }
      }

      event.preventDefault()
      const data = event.data
      send({type: 'insert.text', text: typeof data === 'string' ? data : ''})
      debugLog({
        inputType,
        cancelable: event.cancelable,
        path: 'fast',
        detail: `composition-finalize data=${typeof data === 'string' ? JSON.stringify(data) : 'null'} savedSelection=${!!savedSelection}`,
      })
      return
    }

    // Snapshot PT blocks BEFORE the DOM mutation — this is our "before"
    // state for the eventual parse-and-diff
    lastKnownBlocks = snapshotBlocks()

    // insertReplacementText (autocorrect/spellcheck): when cancelable
    // (desktop), handle immediately via preventDefault + behavior event.
    // When not cancelable (Android), fall through to the slow path —
    // the browser performs the replacement, and parse-and-diff detects it.
    if (
      inputType === 'insertReplacementText' &&
      event.cancelable &&
      !editor.isNodeMapDirty
    ) {
      const data = event.data
      const text = typeof data === 'string' ? data : ''
      if (text) {
        const [nativeTargetRange] = event.getTargetRanges()
        if (nativeTargetRange) {
          const targetRange = ReactEditor.toSlateRange(
            editor,
            nativeTargetRange,
            {
              exactMatch: false,
              suppressThrow: true,
            },
          )
          if (targetRange) {
            Transforms.select(editor, targetRange)
          }
        }

        event.preventDefault()
        send({type: 'insert.text', text})
        debugLog({
          inputType,
          cancelable: event.cancelable,
          path: 'insertReplacementText',
          detail: `text=${JSON.stringify(text)}`,
        })
        return
      }
    }

    // Try the fast path: preventDefault + immediate behavior event
    if (tryFastPath(event)) {
      debugLog({
        inputType,
        cancelable: event.cancelable,
        path: 'fast',
        detail: `data=${typeof event.data === 'string' ? JSON.stringify(event.data) : 'null'}`,
      })
      return
    }

    // Slow path: let the browser mutate the DOM, then parse-and-diff later
    debugLog({
      inputType,
      cancelable: event.cancelable,
      path: 'slow',
      detail: `data=${typeof event.data === 'string' ? JSON.stringify(event.data) : 'null'}`,
    })
    pendingAction = true
    isSlowPath = true

    // Schedule a flush in case no input event fires (e.g., Chrome deleting
    // before a non-contenteditable element fires beforeinput but not input)
    actionTimeoutId = setTimeout(flush, FLUSH_DELAY)
  }

  const handleCompositionStart = (_event: CompositionEvent): void => {
    debugLog({
      inputType: 'compositionstart',
      cancelable: false,
      path: 'composition',
      detail: '',
    })
    isComposing = true
    editor.composing = true

    // Capture the selection at composition start — needed for the
    // composition-finalize handler. When composition spans an annotation
    // boundary, the browser collapses the selection into one span and
    // places composed text there. getTargetRanges() at insertText time
    // reports the browser's chosen position, not the original cross-
    // boundary selection. We need the original selection so the behavior
    // system correctly handles the cross-boundary deletion + insertion.
    compositionStartSelection = editor.selection
      ? {
          anchor: {...editor.selection.anchor},
          focus: {...editor.selection.focus},
        }
      : null

    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId)
      compositionEndTimeoutId = null
    }

    // Snapshot blocks at composition start — the diff at composition end
    // captures the entire composition as a single change
    lastKnownBlocks = snapshotBlocks()
  }

  // Blocks captured synchronously at compositionEnd, before React's
  // microtask can trigger RestoreDOM and revert the composed DOM mutations.
  let compositionEndBlocks: PortableTextBlock[] | null = null

  // Selection captured at compositionStart — used by the composition-
  // finalize handler to restore the original cross-boundary selection.
  let compositionStartSelection: Range | null = null

  const handleCompositionEnd = (event: CompositionEvent): void => {
    // Capture the composition data — this is the final committed text.
    // Needed for cross-boundary composition where parse-and-diff can't
    // determine the user's intent (the browser places composed text in
    // whichever span it chose, not necessarily where the user intended).
    const compositionData = typeof event.data === 'string' ? event.data : null

    // Capture the DOM state NOW — synchronously — before editable.tsx's
    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId)
    }

    // Check if this is a cross-boundary composition (selection spanned
    // different spans). Cross-boundary compositions need special handling
    // via the timeout because parse-and-diff can't determine the user's
    // intent — the browser places composed text in whichever span it chose.
    const savedSelection = compositionStartSelection
    const isCrossBoundary =
      savedSelection !== null &&
      compositionData !== null &&
      !Range.isCollapsed(savedSelection) &&
      isCrossBoundarySelection(savedSelection)

    if (!isCrossBoundary) {
      // Same-span composition: send insert.text synchronously so callers
      // that read the editor value immediately after composition see the
      // updated value. This is critical for userEvent.fill() in Firefox,
      // which wraps text insertion in composition events.
      //
      // We use compositionData (from the compositionend event) rather than
      // parsing the DOM, because the DOM structure may have been destroyed
      // by the composition (e.g., userEvent.fill() replaces all child
      // elements with bare text).
      //
      // Note on the two composing flags:
      // - isComposing (internal) controls event routing in tryFastPath
      // - editor.composing controls RestoreDOM and onDOMSelectionChange
      // Both are cleared here. editable.tsx also clears editor.composing
      // via microtask, but we clear it synchronously so RestoreDOM can
      // revert structural mutations immediately.
      isComposing = false
      editor.composing = false
      compositionStartSelection = null
      compositionEndBlocks = null

      if (compositionData) {
        send({type: 'insert.text', text: compositionData})
        debugLog({
          inputType: 'compositionend',
          cancelable: false,
          path: 'fast',
          detail: `same-span composition: sent insert.text "${compositionData}"`,
        })
      }

      // Update snapshot for next diff cycle
      lastKnownBlocks = snapshotBlocks()
      mutatedNodes = new Set()
      isSlowPath = false
    } else {
      // Cross-boundary composition: defer to timeout so we can restore
      // the original selection and send insert.text via the behavior system.
      //
      // Capture the DOM state now (before RestoreDOM reverts structural
      // mutations in the next React render) for the parse-and-diff fallback.
      const editorElement = editorRef.current
      if (editorElement) {
        compositionEndBlocks = parseDOMToPortableText(editorElement, {
          textBlockType: getTextBlockType(),
          elementToNode: editor.elementToNode,
          mutatedNodes,
        })
      }

      compositionEndTimeoutId = setTimeout(() => {
        isComposing = false
        editor.composing = false
        compositionStartSelection = null

        try {
          Transforms.select(editor, savedSelection)
          send({type: 'insert.text', text: compositionData})
          debugLog({
            inputType: 'compositionend',
            cancelable: false,
            path: 'fast',
            detail: `cross-boundary composition: restored selection, sent insert.text "${compositionData}"`,
          })
          // Update snapshot for next diff cycle
          lastKnownBlocks = snapshotBlocks()
          mutatedNodes = new Set()
          isSlowPath = false
          compositionEndBlocks = null
          return
        } catch {
          // Selection may be invalid — fall through to parse-and-diff
        }

        // Now that composition is done, parse-and-diff to see what changed.
        pendingAction = true
        flush()
      }, COMPOSITION_RESOLVE_DELAY)
    }
  }

  const handleInput = (): void => {
    if (pendingAction && !isComposing) {
      debugLog({
        inputType: 'input',
        cancelable: false,
        path: 'slow',
        detail: 'flush from handleInput',
      })
      flush()
    }
  }

  const handleKeyDown = (_event: KeyboardEvent): void => {
    // SwiftKey compat: temporarily hide the placeholder so SwiftKey doesn't
    // close the keyboard when typing next to a non-contenteditable element.
    if (!pendingAction) {
      const placeholderElement = editor.domPlaceholderElement
      if (placeholderElement) {
        placeholderElement.style.display = 'none'
        setTimeout(() => {
          placeholderElement.style.removeProperty('display')
        })
      }
    }
  }

  const handleUserSelect = (range: Range | null): void => {
    editor.pendingSelection = range

    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }

    if (!range) {
      return
    }

    if (pendingAction) {
      flushTimeoutId = setTimeout(flush, FLUSH_DELAY)
    }
  }

  const handleDomMutations = (mutations: MutationRecord[]): void => {
    // Track which DOM nodes were mutated for the parser's fast-path optimization
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        addMutatedNodeAncestors(mutation.target)
      }
    }

    // If no pending work and we're on the slow path (browser mutated the DOM
    // for a non-cancelable event), check for unexpected mutations and force
    // re-render to restore DOM state. On the fast path we called
    // preventDefault() so there should be no unexpected DOM mutations —
    // calling forceRender() there would interfere with React renders
    // (e.g., range decoration updates).
    if (!pendingAction && isSlowPath) {
      if (
        mutations.some((mutation) =>
          isTrackedMutation(editor, mutation, mutations),
        )
      ) {
        editor.forceRender?.()
      }
    }
  }

  // -------------------------------------------------------------------------
  // Status queries
  // -------------------------------------------------------------------------

  const hasPendingDiffs = (): boolean => pendingAction
  const hasPendingAction = (): boolean => pendingAction
  const hasPendingChanges = (): boolean => pendingAction
  const isFlushing = (): boolean | 'action' => flushing

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------

  return {
    flush,
    scheduleFlush,
    hasPendingDiffs,
    hasPendingAction,
    hasPendingChanges,
    isFlushing,
    handleUserSelect,
    handleCompositionEnd,
    handleCompositionStart,
    handleDOMBeforeInput,
    handleKeyDown,
    handleDomMutations,
    handleInput,
    get drainPendingMutations() {
      return drainPendingMutations
    },
    set drainPendingMutations(fn: (() => void) | null) {
      drainPendingMutations = fn
    },
  }
}
