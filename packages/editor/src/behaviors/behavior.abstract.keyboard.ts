import {defaultKeyboardShortcuts} from '../keyboard-shortcuts/default-keyboard-shortcuts'
import * as selectors from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractKeyboardBehaviors = [
  /**
   * Allow raising an `insert.break` event when pressing Enter on an inline
   * object.
   */
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      defaultKeyboardShortcuts.break.guard(event.originEvent) &&
      selectors.isSelectionCollapsed(snapshot) &&
      selectors.getFocusInlineObject(snapshot),
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
]
