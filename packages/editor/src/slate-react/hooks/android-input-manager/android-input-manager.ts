import type {EditorActor} from '../../../editor/editor-machine'
import {
  Editor,
  Node,
  Path,
  Point,
  Range,
  Text,
  Transforms,
} from '../../../slate'
import {
  applyStringDiff,
  EDITOR_TO_FORCE_RENDER,
  EDITOR_TO_PENDING_ACTION,
  EDITOR_TO_PENDING_DIFFS,
  EDITOR_TO_PENDING_INSERTION_MARKS,
  EDITOR_TO_PENDING_SELECTION,
  EDITOR_TO_PLACEHOLDER_ELEMENT,
  EDITOR_TO_USER_MARKS,
  IS_COMPOSING,
  IS_NODE_MAP_DIRTY,
  isTrackedMutation,
  mergeStringDiffs,
  normalizePoint,
  normalizeRange,
  normalizeStringDiff,
  targetRange,
  verifyDiffState,
  type StringDiff,
  type TextDiff,
} from '../../../slate-dom'
import {ReactEditor} from '../../plugin/react-editor'
import type {DebouncedFunc} from '../../utils/debounce'

export type Action = {at?: Point | Range; run: () => void}

// https://github.com/facebook/draft-js/blob/main/src/component/handlers/composition/DraftEditorCompositionHandler.js#L41
// When using keyboard English association function, conpositionEnd triggered too fast, resulting in after `insertText` still maintain association state.
const RESOLVE_DELAY = 25

// Time with no user interaction before the current user action is considered as done.
const FLUSH_DELAY = 200

// Replace with `const debug = console.log` to debug
const debug = (..._: unknown[]) => {}

// Type guard to check if a value is a DataTransfer
const isDataTransfer = (value: any): value is DataTransfer =>
  value?.constructor.name === 'DataTransfer'

export type CreateAndroidInputManagerOptions = {
  editor: Editor
  editorActor: EditorActor

  scheduleOnDOMSelectionChange: DebouncedFunc<() => void>
  onDOMSelectionChange: DebouncedFunc<() => void>
}

export type AndroidInputManager = {
  flush: () => void
  scheduleFlush: () => void

  hasPendingDiffs: () => boolean
  hasPendingAction: () => boolean
  hasPendingChanges: () => boolean
  isFlushing: () => boolean | 'action'

  handleUserSelect: (range: Range | null) => void
  handleCompositionEnd: (event: React.CompositionEvent<HTMLDivElement>) => void
  handleCompositionStart: (
    event: React.CompositionEvent<HTMLDivElement>,
  ) => void
  handleDOMBeforeInput: (event: InputEvent) => void
  handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void

  handleDomMutations: (mutations: MutationRecord[]) => void
  handleInput: () => void
}

export function createAndroidInputManager({
  editor,
  editorActor,
  scheduleOnDOMSelectionChange,
  onDOMSelectionChange,
}: CreateAndroidInputManagerOptions): AndroidInputManager {
  let flushing: 'action' | boolean = false
  let compositionEndTimeoutId: ReturnType<typeof setTimeout> | null = null
  let flushTimeoutId: ReturnType<typeof setTimeout> | null = null
  let actionTimeoutId: ReturnType<typeof setTimeout> | null = null

  let idCounter = 0
  let insertPositionHint: StringDiff | null | false = false

  const applyPendingSelection = () => {
    const pendingSelection = EDITOR_TO_PENDING_SELECTION.get(editor)
    EDITOR_TO_PENDING_SELECTION.delete(editor)

    if (pendingSelection) {
      const {selection} = editor
      const normalized = normalizeRange(editor, pendingSelection)

      debug('apply pending selection', pendingSelection, normalized)

      if (normalized && (!selection || !Range.equals(normalized, selection))) {
        Transforms.select(editor, normalized)
      }
    }
  }

  const performAction = () => {
    const action = EDITOR_TO_PENDING_ACTION.get(editor)
    EDITOR_TO_PENDING_ACTION.delete(editor)
    if (!action) {
      return
    }

    if (action.at) {
      const target = Point.isPoint(action.at)
        ? normalizePoint(editor, action.at)
        : normalizeRange(editor, action.at)

      if (!target) {
        return
      }

      const targetRange = Editor.range(editor, target)
      if (!editor.selection || !Range.equals(editor.selection, targetRange)) {
        Transforms.select(editor, target)
      }
    }

    action.run()
  }

  const flush = () => {
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }

    if (actionTimeoutId) {
      clearTimeout(actionTimeoutId)
      actionTimeoutId = null
    }

    if (!hasPendingDiffs() && !hasPendingAction()) {
      applyPendingSelection()
      return
    }

    if (!flushing) {
      flushing = true
      // biome-ignore lint/suspicious/noAssignInExpressions: Slate upstream pattern
      setTimeout(() => (flushing = false))
    }

    if (hasPendingAction()) {
      flushing = 'action'
    }

    const selectionRef =
      editor.selection &&
      Editor.rangeRef(editor, editor.selection, {affinity: 'forward'})
    EDITOR_TO_USER_MARKS.set(editor, editor.marks)

    debug(
      'flush',
      EDITOR_TO_PENDING_ACTION.get(editor),
      EDITOR_TO_PENDING_DIFFS.get(editor),
    )

    let scheduleSelectionChange = hasPendingDiffs()

    let diff: TextDiff | undefined
    // biome-ignore lint/suspicious/noAssignInExpressions: Slate upstream pattern
    while ((diff = EDITOR_TO_PENDING_DIFFS.get(editor)?.[0])) {
      const pendingMarks = EDITOR_TO_PENDING_INSERTION_MARKS.get(editor)

      if (pendingMarks !== undefined) {
        EDITOR_TO_PENDING_INSERTION_MARKS.delete(editor)
        editor.marks = pendingMarks as typeof editor.marks
      }

      if (pendingMarks && insertPositionHint === false) {
        insertPositionHint = null
        debug('insert after mark placeholder')
      }

      const range = targetRange(diff)
      if (!editor.selection || !Range.equals(editor.selection, range)) {
        Transforms.select(editor, range)
      }

      if (diff.diff.text) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {type: 'insert.text', text: diff.diff.text},
          editor,
        })
      } else {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {type: 'delete', direction: 'forward'},
          editor,
        })
      }

      // Remove diff only after we have applied it to account for it when transforming
      // pending ranges.
      EDITOR_TO_PENDING_DIFFS.set(
        editor,
        // biome-ignore lint/suspicious/noNonNullAssertedOptionalChain: Slate upstream pattern — diffs guaranteed to exist in loop
        EDITOR_TO_PENDING_DIFFS.get(editor)?.filter(({id}) => id !== diff!.id)!,
      )

      if (!verifyDiffState(editor, diff)) {
        debug('invalid diff state')
        scheduleSelectionChange = false
        EDITOR_TO_PENDING_ACTION.delete(editor)
        EDITOR_TO_USER_MARKS.delete(editor)
        flushing = 'action'

        // Ensure we don't restore the pending user (dom) selection
        // since the document and dom state do not match.
        EDITOR_TO_PENDING_SELECTION.delete(editor)
        scheduleOnDOMSelectionChange.cancel()
        onDOMSelectionChange.cancel()
        selectionRef?.unref()
      }
    }

    const selection = selectionRef?.unref()
    if (
      selection &&
      !EDITOR_TO_PENDING_SELECTION.get(editor) &&
      (!editor.selection || !Range.equals(selection, editor.selection))
    ) {
      Transforms.select(editor, selection)
    }

    if (hasPendingAction()) {
      performAction()
      return
    }

    // COMPAT: The selectionChange event is fired after the action is performed,
    // so we have to manually schedule it to ensure we don't 'throw away' the selection
    // while rendering if we have pending changes.
    if (scheduleSelectionChange) {
      debug('scheduleOnDOMSelectionChange pending changes')
      scheduleOnDOMSelectionChange()
    }

    scheduleOnDOMSelectionChange.flush()
    onDOMSelectionChange.flush()

    applyPendingSelection()

    const userMarks = EDITOR_TO_USER_MARKS.get(editor)
    EDITOR_TO_USER_MARKS.delete(editor)
    if (userMarks !== undefined) {
      editor.marks = userMarks as typeof editor.marks
      editor.onChange()
    }
  }

  const handleCompositionEnd = (
    _event: React.CompositionEvent<HTMLDivElement>,
  ) => {
    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId)
    }

    compositionEndTimeoutId = setTimeout(() => {
      IS_COMPOSING.set(editor, false)
      flush()
    }, RESOLVE_DELAY)
  }

  const handleCompositionStart = (
    _event: React.CompositionEvent<HTMLDivElement>,
  ) => {
    debug('composition start')

    IS_COMPOSING.set(editor, true)

    if (compositionEndTimeoutId) {
      clearTimeout(compositionEndTimeoutId)
      compositionEndTimeoutId = null
    }
  }

  const updatePlaceholderVisibility = (forceHide = false) => {
    const placeholderElement = EDITOR_TO_PLACEHOLDER_ELEMENT.get(editor)
    if (!placeholderElement) {
      return
    }

    if (hasPendingDiffs() || forceHide) {
      placeholderElement.style.display = 'none'
      return
    }

    placeholderElement.style.removeProperty('display')
  }

  const storeDiff = (path: Path, diff: StringDiff) => {
    debug('storeDiff', path, diff)

    const pendingDiffs = EDITOR_TO_PENDING_DIFFS.get(editor) ?? []
    EDITOR_TO_PENDING_DIFFS.set(editor, pendingDiffs)

    const target = Node.leaf(editor, path)
    const idx = pendingDiffs.findIndex((change) =>
      Path.equals(change.path, path),
    )
    if (idx < 0) {
      const normalized = normalizeStringDiff(target.text, diff)
      if (normalized) {
        pendingDiffs.push({path, diff, id: idCounter++})
      }

      updatePlaceholderVisibility()
      return
    }

    const merged = mergeStringDiffs(target.text, pendingDiffs[idx]!.diff, diff)
    if (!merged) {
      pendingDiffs.splice(idx, 1)
      updatePlaceholderVisibility()
      return
    }

    pendingDiffs[idx] = {
      ...pendingDiffs[idx]!,
      diff: merged,
    }
  }

  const scheduleAction = (
    run: () => void,
    {at}: {at?: Point | Range} = {},
  ): void => {
    insertPositionHint = false
    debug('scheduleAction', {at, run})

    EDITOR_TO_PENDING_SELECTION.delete(editor)
    scheduleOnDOMSelectionChange.cancel()
    onDOMSelectionChange.cancel()

    if (hasPendingAction()) {
      flush()
    }

    EDITOR_TO_PENDING_ACTION.set(editor, {at, run})

    // COMPAT: When deleting before a non-contenteditable element chrome only fires a beforeinput,
    // (no input) and doesn't perform any dom mutations. Without a flush timeout we would never flush
    // in this case and thus never actually perform the action.
    actionTimeoutId = setTimeout(flush)
  }

  const handleDOMBeforeInput = (event: InputEvent): void => {
    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }

    if (IS_NODE_MAP_DIRTY.get(editor)) {
      return
    }

    const {inputType: type} = event
    let targetRange: Range | null = null
    const data: DataTransfer | string | undefined =
      (event as any).dataTransfer || event.data || undefined

    if (
      insertPositionHint !== false &&
      type !== 'insertText' &&
      type !== 'insertCompositionText'
    ) {
      insertPositionHint = false
    }

    let [nativeTargetRange] = (event as any).getTargetRanges()
    if (nativeTargetRange) {
      targetRange = ReactEditor.toSlateRange(editor, nativeTargetRange, {
        exactMatch: false,
        suppressThrow: true,
      })
    }

    // COMPAT: SelectionChange event is fired after the action is performed, so we
    // have to manually get the selection here to ensure it's up-to-date.
    const window = ReactEditor.getWindow(editor)
    const domSelection = window.getSelection()
    if (!targetRange && domSelection) {
      nativeTargetRange = domSelection
      targetRange = ReactEditor.toSlateRange(editor, domSelection, {
        exactMatch: false,
        suppressThrow: true,
      })
    }

    targetRange = targetRange ?? editor.selection
    if (!targetRange) {
      return
    }

    // By default, the input manager tries to store text diffs so that we can
    // defer flushing them at a later point in time. We don't want to flush
    // for every input event as this can be expensive. However, there are some
    // scenarios where we cannot safely store the text diff and must instead
    // schedule an action to let Slate normalize the editor state.
    let canStoreDiff = true

    if (type.startsWith('delete')) {
      const direction = type.endsWith('Backward') ? 'backward' : 'forward'
      let [start, end] = Range.edges(targetRange)
      let [leaf, path] = Editor.leaf(editor, start.path)

      if (Range.isExpanded(targetRange)) {
        if (leaf.text.length === start.offset && end.offset === 0) {
          const next = Editor.next(editor, {
            at: start.path,
            match: Text.isText,
          })
          if (next && Path.equals(next[1], end.path)) {
            // when deleting a linebreak, targetRange will span across the break (ie start in the node before and end in the node after)
            // if the node before is empty, this will look like a hanging range and get unhung later--which will take the break we want to remove out of the range
            // so to avoid this we collapse the target range to default to single character deletion
            if (direction === 'backward') {
              targetRange = {anchor: end, focus: end}
              start = end
              ;[leaf, path] = next
            } else {
              targetRange = {anchor: start, focus: start}
              end = start
            }
          }
        }
      }

      const diff = {
        text: '',
        start: start.offset,
        end: end.offset,
      }
      const pendingDiffs = EDITOR_TO_PENDING_DIFFS.get(editor)
      const relevantPendingDiffs = pendingDiffs?.find((change) =>
        Path.equals(change.path, path),
      )
      const diffs = relevantPendingDiffs
        ? [relevantPendingDiffs.diff, diff]
        : [diff]
      const text = applyStringDiff(leaf.text, ...diffs)

      if (text.length === 0) {
        // Text leaf will be removed, so we need to schedule an
        // action to remove it so that Slate can normalize instead
        // of storing as a diff
        canStoreDiff = false
      }

      if (Range.isExpanded(targetRange)) {
        if (
          canStoreDiff &&
          Path.equals(targetRange.anchor.path, targetRange.focus.path)
        ) {
          const point = {path: targetRange.anchor.path, offset: start.offset}
          const range = Editor.range(editor, point, point)
          handleUserSelect(range)

          return storeDiff(targetRange.anchor.path, {
            text: '',
            end: end.offset,
            start: start.offset,
          })
        }

        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction},
              editor,
            }),
          {at: targetRange},
        )
      }
    }

    switch (type) {
      case 'deleteByComposition':
      case 'deleteByCut':
      case 'deleteByDrag': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete', direction: 'forward'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteContent':
      case 'deleteContentForward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'character'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteContentBackward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'character'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteEntireSoftLine': {
        return scheduleAction(
          () => {
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'line'},
              editor,
            })
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'line'},
              editor,
            })
          },
          {at: targetRange},
        )
      }

      case 'deleteHardLineBackward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'block'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteSoftLineBackward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'line'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteHardLineForward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'block'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteSoftLineForward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'line'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteWordBackward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.backward', unit: 'word'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'deleteWordForward': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'delete.forward', unit: 'word'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'insertLineBreak': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'insert.soft break'},
              editor,
            }),
          {at: targetRange},
        )
      }

      case 'insertParagraph': {
        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'insert.break'},
              editor,
            }),
          {at: targetRange},
        )
      }
      case 'insertCompositionText':
      case 'deleteCompositionText':
      case 'insertFromComposition':
      case 'insertFromDrop':
      case 'insertFromPaste':
      case 'insertFromYank':
      case 'insertReplacementText':
      case 'insertText': {
        if (isDataTransfer(data)) {
          return scheduleAction(
            () =>
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {
                  type: 'input.*',
                  originEvent: {dataTransfer: data},
                },
                editor,
              }),
            {at: targetRange},
          )
        }

        let text = data ?? ''

        // COMPAT: If we are writing inside a placeholder, the ime inserts the text inside
        // the placeholder itself and thus includes the zero-width space inside edit events.
        if (EDITOR_TO_PENDING_INSERTION_MARKS.get(editor)) {
          text = text.replace('\uFEFF', '')
        }

        // Pastes from the Android clipboard will generate `insertText` events.
        // If the copied text contains any newlines, Android will append an
        // extra newline to the end of the copied text.
        if (type === 'insertText' && /.*\n.*\n$/.test(text)) {
          text = text.slice(0, -1)
        }

        // If the text includes a newline, split it at newlines and paste each component
        // string, with soft breaks in between each.
        if (text.includes('\n')) {
          return scheduleAction(
            () => {
              const parts = text.split('\n')
              parts.forEach((line, i) => {
                if (line) {
                  editorActor.send({
                    type: 'behavior event',
                    behaviorEvent: {type: 'insert.text', text: line},
                    editor,
                  })
                }
                if (i !== parts.length - 1) {
                  editorActor.send({
                    type: 'behavior event',
                    behaviorEvent: {type: 'insert.soft break'},
                    editor,
                  })
                }
              })
            },
            {
              at: targetRange,
            },
          )
        }

        if (Path.equals(targetRange.anchor.path, targetRange.focus.path)) {
          const [start, end] = Range.edges(targetRange)

          const diff = {
            start: start.offset,
            end: end.offset,
            text,
          }

          // COMPAT: Swiftkey has a weird bug where the target range of the 2nd word
          // inserted after a mark placeholder is inserted with an anchor offset off by 1.
          // So writing 'some text' will result in 'some ttext'. Luckily all 'normal' insert
          // text events are fired with the correct target ranges, only the final 'insertComposition'
          // isn't, so we can adjust the target range start offset if we are confident this is the
          // swiftkey insert causing the issue.
          if (text && insertPositionHint && type === 'insertCompositionText') {
            const hintPosition =
              insertPositionHint.start + insertPositionHint.text.search(/\S|$/)
            const diffPosition = diff.start + diff.text.search(/\S|$/)

            if (
              diffPosition === hintPosition + 1 &&
              diff.end ===
                insertPositionHint.start + insertPositionHint.text.length
            ) {
              debug('adjusting swiftKey insert position using hint')
              diff.start -= 1
              insertPositionHint = null
              scheduleFlush()
            } else {
              insertPositionHint = false
            }
          } else if (type === 'insertText') {
            if (insertPositionHint === null) {
              insertPositionHint = diff
            } else if (
              insertPositionHint &&
              Range.isCollapsed(targetRange) &&
              insertPositionHint.end + insertPositionHint.text.length ===
                start.offset
            ) {
              insertPositionHint = {
                ...insertPositionHint,
                text: insertPositionHint.text + text,
              }
            } else {
              insertPositionHint = false
            }
          } else {
            insertPositionHint = false
          }

          if (canStoreDiff) {
            const currentSelection = editor.selection
            storeDiff(start.path, diff)

            if (currentSelection) {
              const newPoint = {
                path: start.path,
                offset: start.offset + text.length,
              }

              scheduleAction(
                () => {
                  Transforms.select(editor, {
                    anchor: newPoint,
                    focus: newPoint,
                  })
                },
                {at: newPoint},
              )
            }
            return
          }
        }

        return scheduleAction(
          () =>
            editorActor.send({
              type: 'behavior event',
              behaviorEvent: {type: 'insert.text', text},
              editor,
            }),
          {at: targetRange},
        )
      }
    }
  }

  const hasPendingAction = () => {
    return !!EDITOR_TO_PENDING_ACTION.get(editor)
  }

  const hasPendingDiffs = () => {
    return !!EDITOR_TO_PENDING_DIFFS.get(editor)?.length
  }

  const hasPendingChanges = () => {
    return hasPendingAction() || hasPendingDiffs()
  }

  const isFlushing = () => {
    return flushing
  }

  const handleUserSelect = (range: Range | null) => {
    EDITOR_TO_PENDING_SELECTION.set(editor, range)

    if (flushTimeoutId) {
      clearTimeout(flushTimeoutId)
      flushTimeoutId = null
    }

    const {selection} = editor
    if (!range) {
      return
    }

    const pathChanged =
      !selection || !Path.equals(selection.anchor.path, range.anchor.path)
    const parentPathChanged =
      !selection ||
      !Path.equals(
        selection.anchor.path.slice(0, -1),
        range.anchor.path.slice(0, -1),
      )

    if ((pathChanged && insertPositionHint) || parentPathChanged) {
      insertPositionHint = false
    }

    if (pathChanged || hasPendingDiffs()) {
      flushTimeoutId = setTimeout(flush, FLUSH_DELAY)
    }
  }

  const handleInput = () => {
    if (hasPendingAction() || !hasPendingDiffs()) {
      debug('flush input')
      flush()
    }
  }

  const handleKeyDown = (_: React.KeyboardEvent) => {
    // COMPAT: Swiftkey closes the keyboard when typing inside a empty node
    // directly next to a non-contenteditable element (= the placeholder).
    // The only event fired soon enough for us to allow hiding the placeholder
    // without swiftkey picking it up is the keydown event, so we have to hide it
    // here. See https://github.com/ianstormtaylor/slate/pull/4988#issuecomment-1201050535
    if (!hasPendingDiffs()) {
      updatePlaceholderVisibility(true)
      setTimeout(updatePlaceholderVisibility)
    }
  }

  const scheduleFlush = () => {
    if (!hasPendingAction()) {
      actionTimeoutId = setTimeout(flush)
    }
  }

  const handleDomMutations = (mutations: MutationRecord[]) => {
    if (hasPendingDiffs() || hasPendingAction()) {
      return
    }

    if (
      mutations.some((mutation) =>
        isTrackedMutation(editor, mutation, mutations),
      )
    ) {
      // Cause a re-render to restore the dom state if we encounter tracked mutations without
      // a corresponding pending action.
      EDITOR_TO_FORCE_RENDER.get(editor)?.()
    }
  }

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
  }
}
