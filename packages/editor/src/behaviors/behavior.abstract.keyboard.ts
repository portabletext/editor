import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {getBlock, getPreviousBlock} from '../traversal'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const shiftLeft = createKeyboardShortcut({
  default: [
    {
      key: 'ArrowLeft',
      shift: true,
      meta: false,
      ctrl: false,
      alt: false,
    },
  ],
})

export const abstractKeyboardBehaviors = [
  /**
   * When Backspace is pressed on an inline object, Slate will raise a
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
   * When Delete is pressed on an inline object, Slate will raise a
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
   * Fix edge case where Shift+ArrowLeft didn't reduce a selection hanging
   * onto an empty text block.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (!snapshot.context.selection || !shiftLeft.guard(event.originEvent)) {
        return false
      }

      const focusBlock = getBlock(snapshot)

      if (!focusBlock) {
        return false
      }

      const previousBlock = getPreviousBlock(snapshot, {at: focusBlock.path})

      if (!previousBlock) {
        return false
      }

      const hanging =
        isTextBlockNode(snapshot.context, focusBlock.node) &&
        snapshot.context.selection.focus.offset === 0

      if (hanging && isEmptyTextBlock(snapshot.context, focusBlock.node)) {
        return {previousBlock, selection: snapshot.context.selection}
      }

      return false
    },
    actions: [
      ({snapshot}, {previousBlock, selection}) => [
        raise({
          type: 'select',
          at: {
            anchor: selection.anchor,
            focus: getBlockEndPoint({
              context: snapshot.context,
              block: previousBlock,
            }),
          },
        }),
      ],
    ],
  }),
]
