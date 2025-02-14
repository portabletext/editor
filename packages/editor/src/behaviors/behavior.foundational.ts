import {keyIs} from '../internal-utils/key-is'
import {defineBehavior, raise} from './behavior.types'

/**
 * On WebKit, Shift+Enter results in an `insertParagraph` input event rather
 * than an `insertLineBreak` input event. This Behavior makes sure we catch
 * that `key.down` event beforehand and raise an `insert.soft break` manually.
 */
const raiseSoftBreak = defineBehavior({
  on: 'key.down',
  guard: ({event}) => keyIs.lineBreak(event.keyboardEvent),
  actions: [() => [raise({type: 'insert.soft break'})]],
})

export const foundationalBehaviors = [raiseSoftBreak]
