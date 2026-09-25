import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {getLeaf} from '../traversal/get-leaf'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractKeyboardBehaviors = [
  /**
   * When Backspace is pressed on an inline object, the engine raises a
   * `delete.backward` event with `unit: 'block'`. This is wrong and this
   * Behavior adjusts that.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.backspace.guard(event.originEvent) &&
      isSelectionCollapsed(snapshot) &&
      getFocusInlineObject(snapshot),
    actions: [() => [raise({type: 'delete.backward', unit: 'character'})]],
  }),

  /**
   * When Delete is pressed on an inline object, the engine raises a
   * `delete.forward` event with `unit: 'block'`. This is wrong and this
   * Behavior adjusts that.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.delete.guard(event.originEvent) &&
      isSelectionCollapsed(snapshot) &&
      getFocusInlineObject(snapshot),
    actions: [() => [raise({type: 'delete.forward', unit: 'character'})]],
  }),

  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) =>
      defaultKeyboardShortcuts.deleteWord.backward.guard(event.originEvent),
    actions: [() => [raise({type: 'delete.backward', unit: 'word'})]],
  }),

  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) =>
      defaultKeyboardShortcuts.deleteWord.forward.guard(event.originEvent),
    actions: [() => [raise({type: 'delete.forward', unit: 'word'})]],
  }),

  /**
   * Allow raising an `insert.break` event when pressing Enter on an inline
   * object.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.break.guard(event.originEvent) &&
      isSelectionCollapsed(snapshot) &&
      getFocusInlineObject(snapshot),
    actions: [() => [raise({type: 'insert.break'})]],
  }),

  /**
   * On Firefox, Enter might collapse the selection. To mitigate this, we
   * `raise` an `insert.break` event manually.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.break.guard(event.originEvent) &&
      isSelectionExpanded(snapshot),
    actions: [() => [raise({type: 'insert.break'})]],
  }),

  /**
   * On WebKit, Shift+Enter results in an `insertParagraph` input event rather
   * than an `insertLineBreak` input event. This Behavior makes sure we catch
   * that `keyboard.keydown` event beforehand and raise an `insert.soft break` manually.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) =>
      defaultKeyboardShortcuts.lineBreak.guard(event.originEvent),
    actions: [() => [raise({type: 'insert.soft break'})]],
  }),

  /**
   * Manual handling of undo shortcuts.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) =>
      defaultKeyboardShortcuts.history.undo.guard(event.originEvent),
    actions: [() => [raise({type: 'history.undo'})]],
  }),

  /**
   * Manual handling of redo shortcuts.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({event}) =>
      defaultKeyboardShortcuts.history.redo.guard(event.originEvent),
    actions: [() => [raise({type: 'history.redo'})]],
  }),

  /**
   * Manual handling of select-all. The native gesture cannot be trusted to
   * build the range: chromium produces an already-collapsed range whenever a
   * non-editable element sits at either content edge of the editing host,
   * which any document starting or ending with a void block or a
   * chrome-bearing container render does. "Everything" is a model-level
   * statement, so the range is computed from the model instead of
   * round-tripping through the DOM selection.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!defaultKeyboardShortcuts.selectAll.guard(event.originEvent)) {
        return false
      }

      const startLeaf = getLeaf(snapshot, [], {edge: 'start'})
      const endLeaf = getLeaf(snapshot, [], {edge: 'end'})
      const startBlock = startLeaf
        ? getEnclosingBlock(snapshot, startLeaf.path)
        : undefined
      const endBlock = endLeaf
        ? getEnclosingBlock(snapshot, endLeaf.path)
        : undefined

      if (!startBlock || !endBlock) {
        return false
      }

      return {
        anchor: getBlockStartPoint({
          context: snapshot.context,
          block: startBlock,
        }),
        focus: getBlockEndPoint({
          context: snapshot.context,
          block: endBlock,
        }),
      }
    },
    actions: [
      (_, {anchor, focus}) => [raise({type: 'select', at: {anchor, focus}})],
    ],
  }),
]
