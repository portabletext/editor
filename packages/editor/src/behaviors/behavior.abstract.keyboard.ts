import {keyIs} from '../internal-utils/key-is'
import * as selectors from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractKeyboardBehaviors = [
  defineBehavior({
    on: 'keyboard.keydown',
    guard: ({snapshot, event}) =>
      keyIs.break(event.originEvent) &&
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
    guard: ({event}) => keyIs.lineBreak(event.originEvent),
    actions: [() => [raise({type: 'insert.soft break'})]],
  }),
]
