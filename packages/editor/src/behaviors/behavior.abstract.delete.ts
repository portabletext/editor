import * as selectors from '../selectors'
import * as utils from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeleteBehaviors = [
  defineBehavior({
    on: 'delete.text',
    guard: ({snapshot, event}) => {
      const selection = utils.blockOffsetsToSelection({
        value: snapshot.context.value,
        offsets: event.at,
      })

      if (!selection) {
        return false
      }

      const trimmedSelection = selectors.getTrimmedSelection({
        beta: {hasTag: () => false, internalDrag: undefined},
        context: {
          converters: [],
          schema: snapshot.context.schema,
          keyGenerator: snapshot.context.keyGenerator,
          activeDecorators: [],
          readOnly: false,
          value: snapshot.context.value,
          selection,
        },
      })

      if (!trimmedSelection) {
        return false
      }

      return {
        selection: trimmedSelection,
      }
    },
    actions: [(_, {selection}) => [raise({type: 'delete', at: selection})]],
  }),
]
