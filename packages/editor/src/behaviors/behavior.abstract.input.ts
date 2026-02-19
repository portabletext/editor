import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {forward, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractInputBehaviors = [
  defineBehavior({
    name: 'inputDeleteExpandedSelection',
    on: 'input.*',
    guard: ({snapshot}) => isSelectionExpanded(snapshot),
    actions: [({event}) => [raise({type: 'delete'}), forward(event)]],
  }),
  /**
   * Handle input events where HTML equals plain text (e.g., Safari autocorrect).
   * In this case, we use insert.text to preserve existing marks.
   */
  defineBehavior({
    name: 'inputInsertTextFromDataTransfer',
    on: 'input.*',
    guard: ({event}) => {
      const text = event.originEvent.dataTransfer.getData('text/plain')
      const html = event.originEvent.dataTransfer.getData('text/html')
      const types = event.originEvent.dataTransfer.types

      if (!text) {
        return false
      }

      // Multi-line text should go through deserialize for proper paragraph handling
      if (text.includes('\n')) {
        return false
      }

      if (types.length === 1) {
        return {text}
      }

      if (types.length > 2) {
        return false
      }

      if (html && text === html) {
        return {text}
      }

      return false
    },
    actions: [
      (_, {text}) => [
        raise({
          type: 'insert.text',
          text,
        }),
      ],
    ],
  }),
  defineBehavior({
    name: 'inputDeserialize',
    on: 'input.*',
    actions: [
      ({event}) => [
        raise({
          type: 'deserialize',
          originEvent: event,
        }),
      ],
    ],
  }),
]
