import type {PortableTextBlock} from '@portabletext/schema'
import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import type {EditorActor} from '../editor/editor-machine'
import {Path, Range, Transforms} from '../slate'
import {getSelection, isTrackedMutation} from '../slate-dom'
import {ReactEditor} from '../slate-react/plugin/react-editor'
import type {DebouncedFunc} from '../slate-react/utils/debounce'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {detectChange} from './change-detector'
import {portableTextChangeToBehaviorEvent} from './change-to-behavior-event'
import type {BlockTextSnapshot} from './dom-text-reader'
import {readBlockTexts} from './dom-text-reader'

// Some IMEs fire compositionEnd before the final insertText
const COMPOSITION_RESOLVE_DELAY = 25

const FLUSH_DELAY = 200

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

export type InputManagerOptions = {
  editor: PortableTextSlateEditor
  editorActor: EditorActor
  editorRef: React.RefObject<HTMLElement>
  scheduleOnDOMSelectionChange: DebouncedFunc<() => void>
  onDOMSelectionChange: DebouncedFunc<() => void>
}

/**
 * Translates browser input events into Behavior Events.
 *
 * Two strategies depending on whether the event is cancelable:
 *
 * **Fast path** — desktop typing, delete, paste, Enter:
 *   The `beforeinput` event is cancelable, so we call `preventDefault()` to
 *   stop the browser from touching the DOM and dispatch the corresponding
 *   Behavior Event (`insert.text`, `delete.backward`, etc.) immediately.
 *
 * **Slow path** — Android IME, composition, mobile spellcheck:
 *   The `beforeinput` event is not cancelable, so the browser will mutate
 *   the DOM. We snapshot the current blocks before the mutation, let the
 *   browser do its thing, then `flush()`:
 *     1. Read block text from the mutated DOM (just keys + text content)
 *     2. Diff against the snapshot to detect what changed
 *     3. Map the detected change to a Behavior Event and dispatch it
 */
export class InputManager {
  private editor: PortableTextSlateEditor
  private editorActor: EditorActor
  private editorRef: React.RefObject<HTMLElement>
  private scheduleOnDOMSelectionChange: DebouncedFunc<() => void>
  private onDOMSelectionChange: DebouncedFunc<() => void>

  private flushing: 'action' | boolean = false
  private compositionEndTimeoutId: ReturnType<typeof setTimeout> | null = null
  private flushTimeoutId: ReturnType<typeof setTimeout> | null = null
  private actionTimeoutId: ReturnType<typeof setTimeout> | null = null

  private pendingAction = false
  private isComposing = false
  private isSlowPath = false
  private lastKnownBlocks: PortableTextBlock[] = []
  private compositionEndSnapshots: BlockTextSnapshot[] | null = null
  private compositionStartSelection: Range | null = null

  drainPendingMutations: (() => void) | null = null

  constructor(options: InputManagerOptions) {
    this.editor = options.editor
    this.editorActor = options.editorActor
    this.editorRef = options.editorRef
    this.scheduleOnDOMSelectionChange = options.scheduleOnDOMSelectionChange
    this.onDOMSelectionChange = options.onDOMSelectionChange
  }

  hasPendingAction = (): boolean => this.pendingAction

  hasPendingChanges = (): boolean => this.pendingAction

  isFlushing = (): boolean | 'action' => this.flushing

  flush = (): void => {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId)
      this.flushTimeoutId = null
    }

    if (this.actionTimeoutId) {
      clearTimeout(this.actionTimeoutId)
      this.actionTimeoutId = null
    }

    this.drainPendingMutations?.()

    if (!this.pendingAction) {
      return
    }

    if (!this.flushing) {
      this.flushing = 'action'
      try {
        this.pendingAction = false

        const editorElement = this.editorRef.current
        if (!editorElement) {
          this.isSlowPath = false
          return
        }

        const oldBlocks = this.lastKnownBlocks

        // Use snapshots captured at compositionEnd if available (they were
        // read before RestoreDOM reverted the DOM).
        let newSnapshots: BlockTextSnapshot[]
        if (this.compositionEndSnapshots) {
          newSnapshots = this.compositionEndSnapshots
          this.compositionEndSnapshots = null
        } else {
          newSnapshots = readBlockTexts(editorElement)
        }

        const cursorOffset = this.getCurrentCursorOffset()
        const change = detectChange(
          oldBlocks,
          newSnapshots,
          cursorOffset,
          this.editorActor.getSnapshot().context.schema.span.name,
        )

        const mapping = portableTextChangeToBehaviorEvent(change, cursorOffset)

        if (mapping.selectionBefore) {
          this.applySelectionHint(mapping.selectionBefore)
        }

        for (const behaviorEvent of mapping.events) {
          this.editorActor.send({
            type: 'behavior event',
            behaviorEvent,
            editor: this.editor,
          })
        }

        this.lastKnownBlocks = this.snapshotBlocks()
        this.isSlowPath = false

        this.scheduleOnDOMSelectionChange.flush()
        this.onDOMSelectionChange.flush()
      } finally {
        setTimeout(() => {
          this.flushing = false
        })
      }
    }
  }

  scheduleFlush = (): void => {
    if (!this.actionTimeoutId) {
      this.actionTimeoutId = setTimeout(this.flush)
    }
  }

  handleDOMBeforeInput = (event: InputEvent): void => {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId)
      this.flushTimeoutId = null
    }

    // Flush pending selection changes so Slate's selection is current
    // (IMEs and extensions like Grammarly set DOM selection before beforeinput)
    this.scheduleOnDOMSelectionChange.flush()
    this.onDOMSelectionChange.flush()

    const inputType = event.inputType

    if (
      this.isComposing &&
      (inputType === 'insertCompositionText' ||
        inputType === 'deleteCompositionText')
    ) {
      return
    }

    // `insertText` arriving during composition (after compositionEnd but before
    // the timeout clears `isComposing`) is the composition's final commitment.
    // Handle via fast path so cross-boundary selections work correctly.
    if (this.isComposing && inputType === 'insertText' && event.cancelable) {
      this.isComposing = false
      this.editor.composing = false
      this.compositionEndSnapshots = null

      if (this.compositionEndTimeoutId) {
        clearTimeout(this.compositionEndTimeoutId)
        this.compositionEndTimeoutId = null
      }

      // Restore the selection from compositionStart. The browser may have
      // collapsed a cross-boundary selection into one span during composition.
      const savedSelection = this.compositionStartSelection
      this.compositionStartSelection = null

      if (savedSelection) {
        try {
          if (
            !this.editor.selection ||
            !Range.equals(this.editor.selection, savedSelection)
          ) {
            Transforms.select(this.editor, savedSelection)
          }
        } catch {
          // Fall back to getTargetRanges() below
        }
      }

      if (!savedSelection && !this.editor.isNodeMapDirty) {
        const [nativeTargetRange] = event.getTargetRanges()
        if (nativeTargetRange) {
          try {
            const targetRange = ReactEditor.toSlateRange(
              this.editor,
              nativeTargetRange,
              {exactMatch: false, suppressThrow: true},
            )
            if (
              targetRange &&
              (!this.editor.selection ||
                !Range.equals(this.editor.selection, targetRange))
            ) {
              Transforms.select(this.editor, targetRange)
            }
          } catch {
            // Proceed with current selection
          }
        }
      }

      event.preventDefault()
      const data = event.data
      this.send({
        type: 'insert.text',
        text: typeof data === 'string' ? data : '',
      })
      return
    }

    this.lastKnownBlocks = this.snapshotBlocks()

    // `insertReplacementText` (autocorrect/spellcheck): when cancelable
    // (desktop), handle immediately. On Android (not cancelable), fall
    // through to the slow path.
    if (
      inputType === 'insertReplacementText' &&
      event.cancelable &&
      !this.editor.isNodeMapDirty
    ) {
      const data = event.data
      const text = typeof data === 'string' ? data : ''
      if (text) {
        const [nativeTargetRange] = event.getTargetRanges()
        if (nativeTargetRange) {
          const targetRange = ReactEditor.toSlateRange(
            this.editor,
            nativeTargetRange,
            {
              exactMatch: false,
              suppressThrow: true,
            },
          )
          if (targetRange) {
            Transforms.select(this.editor, targetRange)
          }
        }

        event.preventDefault()
        this.send({type: 'insert.text', text})
        return
      }
    }

    if (this.tryFastPath(event)) {
      return
    }

    // Slow path: let the browser mutate the DOM, then parse-and-diff
    this.pendingAction = true
    this.isSlowPath = true

    this.actionTimeoutId = setTimeout(this.flush, FLUSH_DELAY)
  }

  handleCompositionStart = (_event: CompositionEvent): void => {
    this.isComposing = true
    this.editor.composing = true

    // Save the selection for cross-boundary composition handling.
    // The browser may collapse the selection into one span during composition,
    // but we need the original to handle cross-boundary deletion correctly.
    this.compositionStartSelection = this.editor.selection
      ? {
          anchor: {...this.editor.selection.anchor},
          focus: {...this.editor.selection.focus},
        }
      : null

    if (this.compositionEndTimeoutId) {
      clearTimeout(this.compositionEndTimeoutId)
      this.compositionEndTimeoutId = null
    }

    this.lastKnownBlocks = this.snapshotBlocks()
  }

  handleCompositionEnd = (event: CompositionEvent): void => {
    const compositionData = typeof event.data === 'string' ? event.data : null

    if (this.compositionEndTimeoutId) {
      clearTimeout(this.compositionEndTimeoutId)
    }

    const savedSelection = this.compositionStartSelection
    const isCrossBoundary =
      savedSelection !== null &&
      compositionData !== null &&
      !Range.isCollapsed(savedSelection) &&
      isCrossBoundarySelection(savedSelection)

    if (!isCrossBoundary) {
      // Same-span composition: send `insert.text` synchronously so callers
      // that read the editor value immediately see the update. This is
      // critical for `userEvent.fill()` in Firefox.
      //
      // We use `compositionData` rather than parsing the DOM because the
      // DOM structure may have been destroyed by the composition.
      //
      // Two composing flags:
      // - `isComposing` (internal) controls event routing in `tryFastPath`
      // - `editor.composing` controls RestoreDOM and onDOMSelectionChange
      this.isComposing = false
      this.editor.composing = false
      this.compositionStartSelection = null
      this.compositionEndSnapshots = null

      if (compositionData) {
        this.send({type: 'insert.text', text: compositionData})
      }

      this.lastKnownBlocks = this.snapshotBlocks()
      this.isSlowPath = false
    } else {
      // Cross-boundary composition: defer so we can restore the original
      // selection. Capture DOM state now before RestoreDOM reverts it.
      const editorElement = this.editorRef.current
      if (editorElement) {
        this.compositionEndSnapshots = readBlockTexts(editorElement)
      }

      this.compositionEndTimeoutId = setTimeout(() => {
        this.isComposing = false
        this.editor.composing = false
        this.compositionStartSelection = null

        try {
          Transforms.select(this.editor, savedSelection)
          this.send({type: 'insert.text', text: compositionData})
          this.lastKnownBlocks = this.snapshotBlocks()
          this.isSlowPath = false
          this.compositionEndSnapshots = null
          return
        } catch {
          // Selection invalid — fall through to parse-and-diff
        }

        this.pendingAction = true
        this.flush()
      }, COMPOSITION_RESOLVE_DELAY)
    }
  }

  handleInput = (): void => {
    if (this.pendingAction && !this.isComposing) {
      this.flush()
    }
  }

  handleKeyDown = (_event: KeyboardEvent): void => {
    // SwiftKey closes the keyboard when typing next to a non-contenteditable
    // element. Temporarily hiding the placeholder works around this.
    if (!this.pendingAction) {
      const placeholderElement = this.editor.domPlaceholderElement
      if (placeholderElement) {
        placeholderElement.style.display = 'none'
        setTimeout(() => {
          placeholderElement.style.removeProperty('display')
        })
      }
    }
  }

  handleUserSelect = (range: Range | null): void => {
    this.editor.pendingSelection = range

    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId)
      this.flushTimeoutId = null
    }

    if (!range) {
      return
    }

    if (this.pendingAction) {
      this.flushTimeoutId = setTimeout(this.flush, FLUSH_DELAY)
    }
  }

  handleDomMutations = (mutations: MutationRecord[]): void => {
    // On the slow path, force re-render to restore DOM state for unexpected
    // mutations. On the fast path we called preventDefault() so there
    // should be no unexpected mutations — forceRender() there would
    // interfere with React renders (e.g. range decoration updates).
    if (!this.pendingAction && this.isSlowPath) {
      if (
        mutations.some((mutation) =>
          isTrackedMutation(this.editor, mutation, mutations),
        )
      ) {
        this.editor.forceRender?.()
      }
    }
  }

  private snapshotBlocks(): PortableTextBlock[] {
    return [...(this.editor.children as Array<PortableTextBlock>)]
  }

  private getCurrentCursorOffset(): number | undefined {
    const {selection} = this.editor
    if (selection && Range.isCollapsed(selection)) {
      return selection.anchor.offset
    }
    return undefined
  }

  private applySelectionHint(hint: {blockKey: string; offset: number}): void {
    const blockIndex = this.editor.blockIndexMap.get(hint.blockKey)
    if (blockIndex === undefined) {
      return
    }

    const block = (this.editor.children as Array<PortableTextBlock>)[blockIndex]
    if (!block || !('children' in block) || !Array.isArray(block.children)) {
      return
    }

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
      childIndex = i
    }

    const path = [blockIndex, childIndex]
    try {
      const point = {path, offset: remainingOffset}
      const range = {anchor: point, focus: point}
      if (
        !this.editor.selection ||
        !Range.equals(this.editor.selection, range)
      ) {
        Transforms.select(this.editor, range)
      }
    } catch {
      // Invalid path — silently ignore
    }
  }

  private send(behaviorEvent: BehaviorEvent): void {
    this.editorActor.send({
      type: 'behavior event',
      behaviorEvent,
      editor: this.editor,
    })
  }

  private tryFastPath(event: InputEvent): boolean {
    const inputType = event.inputType

    // Structural events always use the fast path, even during composition.
    // On slower environments (CI), Firefox may fire compositionstart before
    // insertParagraph, but the block split must go through the behavior system.
    if (inputType === 'insertParagraph' && event.cancelable) {
      event.preventDefault()
      this.send({type: 'insert.break'})
      return true
    }

    if (inputType === 'insertLineBreak' && event.cancelable) {
      event.preventDefault()
      this.send({type: 'insert.soft break'})
      return true
    }

    if (!event.cancelable || this.isComposing) {
      return false
    }
    const {selection} = this.editor

    // Handled by `handleNativeHistoryEvents` in editable.tsx
    if (inputType === 'historyUndo' || inputType === 'historyRedo') {
      event.preventDefault()
      return true
    }

    if (
      inputType === 'insertCompositionText' ||
      inputType === 'deleteCompositionText'
    ) {
      return false
    }

    // With expanded selection, all delete variants collapse to a simple
    // directional delete — the unit is irrelevant.
    if (
      selection &&
      Range.isExpanded(selection) &&
      inputType.startsWith('delete')
    ) {
      const direction = inputType.endsWith('Backward') ? 'backward' : 'forward'
      event.preventDefault()
      this.send({type: 'delete', direction})
      return true
    }

    // DataTransfer becomes inaccessible after the event handler returns
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
        this.isComposing = false
        this.editor.composing = false
      }

      if (isDataTransfer(data)) {
        this.send({type: 'input.*', originEvent: {dataTransfer: data}})
      } else {
        this.send({
          type: 'insert.text',
          text: typeof data === 'string' ? data : '',
        })
      }
      return true
    }

    if (inputType === 'deleteEntireSoftLine') {
      event.preventDefault()
      this.send({type: 'delete.backward', unit: 'line'})
      this.send({type: 'delete.forward', unit: 'line'})
      return true
    }

    const deleteEvent = DELETE_INPUT_TYPE_MAP[inputType]
    if (deleteEvent) {
      // When Slate's selection is collapsed but the DOM selection is expanded
      // (e.g. after Ctrl+A where selectionchange hasn't been processed yet),
      // sync Slate's selection with the browser's target range.
      // We check the DOM selection (not just the target range) to avoid
      // catching grapheme cluster deletion — where the target range is
      // expanded but the DOM selection is collapsed at the cursor.
      if (
        (inputType === 'deleteContentBackward' ||
          inputType === 'deleteContentForward') &&
        selection &&
        Range.isCollapsed(selection) &&
        !this.editor.isNodeMapDirty
      ) {
        try {
          const root = ReactEditor.findDocumentOrShadowRoot(this.editor)
          const domSelection = getSelection(root)
          if (domSelection && !domSelection.isCollapsed) {
            const [nativeTargetRange] = event.getTargetRanges()
            if (nativeTargetRange) {
              const targetRange = ReactEditor.toSlateRange(
                this.editor,
                nativeTargetRange,
                {exactMatch: false, suppressThrow: true},
              )
              if (targetRange && Range.isExpanded(targetRange)) {
                event.preventDefault()
                Transforms.select(this.editor, targetRange)
                const direction = inputType.endsWith('Backward')
                  ? 'backward'
                  : 'forward'
                this.send({type: 'delete', direction})
                return true
              }
            }
          }
        } catch {
          // Proceed with normal delete handling
        }
      }
      event.preventDefault()
      this.send(deleteEvent)
      return true
    }

    if (inputType === 'insertText') {
      if (isDataTransfer(data)) {
        event.preventDefault()
        this.send({type: 'input.*', originEvent: {dataTransfer: data}})
        return true
      }

      event.preventDefault()
      this.send({
        type: 'insert.text',
        text: typeof data === 'string' ? data : '',
      })
      return true
    }

    return false
  }
}

function isCrossBoundarySelection(selection: Range): boolean {
  return !Path.equals(selection.anchor.path, selection.focus.path)
}

function isDataTransfer(value: any): value is DataTransfer {
  return value?.constructor?.name === 'DataTransfer'
}
