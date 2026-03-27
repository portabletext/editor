import {isTextBlock} from '@portabletext/schema'
import {defaultKeyboardShortcuts} from '../editor/default-keyboard-shortcuts'
import {getFocusBlockObject} from '../selectors'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {isEqualSelectionPoints} from '../utils'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

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
      if (
        !snapshot.context.selection ||
        !defaultKeyboardShortcuts.shiftLeft.guard(event.originEvent)
      ) {
        return false
      }

      const focusBlock = getFocusBlock(snapshot)

      if (!focusBlock) {
        return false
      }

      const previousBlock = getPreviousBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: focusBlock.path,
              offset: 0,
            },
            focus: {
              path: focusBlock.path,
              offset: 0,
            },
          },
        },
      })

      if (!previousBlock) {
        return false
      }

      const hanging =
        isTextBlock(snapshot.context, focusBlock.node) &&
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

  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) => {
      if (
        !snapshot.context.selection ||
        !defaultKeyboardShortcuts.shiftDown.guard(event.originEvent)
      ) {
        return false
      }

      const focusBlockObject = getFocusBlockObject(snapshot)

      if (!focusBlockObject) {
        return false
      }

      const nextBlock = getNextBlock(snapshot)

      if (!nextBlock) {
        return false
      }

      if (!isTextBlock(snapshot.context, nextBlock.node)) {
        return {
          nextBlockEndPoint: getBlockEndPoint({
            context: snapshot.context,
            block: nextBlock,
          }),
          selection: snapshot.context.selection,
        }
      }

      const nextNextBlock = getNextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: nextBlock.path,
              offset: 0,
            },
            focus: {
              path: nextBlock.path,
              offset: 0,
            },
          },
        },
      })

      const nextBlockEndPoint =
        nextNextBlock && isTextBlock(snapshot.context, nextNextBlock.node)
          ? getBlockStartPoint({
              context: snapshot.context,
              block: nextNextBlock,
            })
          : getBlockEndPoint({
              context: snapshot.context,
              block: nextBlock,
            })

      return {nextBlockEndPoint, selection: snapshot.context.selection}
    },
    actions: [
      (_, {nextBlockEndPoint, selection}) => [
        raise({
          type: 'select',
          at: {anchor: selection.anchor, focus: nextBlockEndPoint},
        }),
      ],
    ],
  }),

  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event, dom}) => {
      if (
        !snapshot.context.selection ||
        !defaultKeyboardShortcuts.shiftDown.guard(event.originEvent)
      ) {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const nextBlock = getNextBlock(snapshot)

      if (!nextBlock) {
        return false
      }

      if (isTextBlock(snapshot.context, nextBlock.node)) {
        return false
      }

      const focusBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })

      if (
        isEqualSelectionPoints(
          snapshot.context.selection.focus,
          focusBlockEndPoint,
        )
      ) {
        return false
      }

      // Find the DOM position of the current focus point
      const focusRect = dom.getSelectionRect({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: snapshot.context.selection.focus,
            focus: snapshot.context.selection.focus,
          },
        },
      })
      // Find the DOM position of the focus block end point
      const endPointRect = dom.getSelectionRect({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: focusBlockEndPoint,
            focus: focusBlockEndPoint,
          },
        },
      })

      if (!focusRect || !endPointRect) {
        return false
      }

      if (endPointRect.top > focusRect.top) {
        // If the end point is positioned further from the top than the current
        // focus point, then we can deduce that the end point is on the next
        // line. In this case, we don't want to interfere since the browser
        // does right thing and expands the selection to the end of the current
        // line.
        return false
      }

      // If the end point is positioned at the same level as the current focus
      // point, then we can deduce that the end point is on the same line. In
      // this case, we want to expand the selection to the end point.
      // This mitigates a Firefox bug where Shift+ArrowDown can expand
      // further into the next block.
      return {focusBlockEndPoint, selection: snapshot.context.selection}
    },
    actions: [
      (_, {focusBlockEndPoint, selection}) => [
        raise({
          type: 'select',
          at: {
            anchor: selection.anchor,
            focus: focusBlockEndPoint,
          },
        }),
      ],
    ],
  }),

  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event, dom}) => {
      if (
        !snapshot.context.selection ||
        !defaultKeyboardShortcuts.shiftDown.guard(event.originEvent)
      ) {
        return false
      }

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const nextBlock = getNextBlock(snapshot)

      if (!nextBlock) {
        return false
      }

      const focusBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })

      if (
        isEqualSelectionPoints(
          snapshot.context.selection.focus,
          focusBlockEndPoint,
        )
      ) {
        return false
      }

      // Find the DOM position of the current focus point
      const focusRect = dom.getSelectionRect({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: snapshot.context.selection.focus,
            focus: snapshot.context.selection.focus,
          },
        },
      })
      // Find the DOM position of the focus block end point
      const endPointRect = dom.getSelectionRect({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: focusBlockEndPoint,
            focus: focusBlockEndPoint,
          },
        },
      })

      if (!focusRect || !endPointRect) {
        return false
      }

      if (endPointRect.top > focusRect.top) {
        // If the end point is positioned further from the top than the current
        // focus point, then we can deduce that the end point is on the next
        // line. In this case, we don't want to interfere since the browser
        // does right thing and expands the selection to the end of the current
        // line.
        return false
      }

      // If the end point is positioned at the same level as the current focus
      // point, then we can deduce that the end point is on the same line. In
      // this case, we want to expand the selection to the end of the start
      // block. This mitigates a Chromium bug where Shift+ArrowDown can expand
      // further into the next block.
      const nextBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: nextBlock,
      })

      return {nextBlockStartPoint, selection: snapshot.context.selection}
    },
    actions: [
      (_, {nextBlockStartPoint, selection}) => [
        raise({
          type: 'select',
          at: {
            anchor: selection.anchor,
            focus: nextBlockStartPoint,
          },
        }),
      ],
    ],
  }),
]
