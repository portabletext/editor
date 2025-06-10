import * as selectors from '../selectors'
import * as utils from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeleteBehaviors = [
  defineBehavior({
    on: 'delete.backward',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      return {selection: snapshot.context.selection}
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'delete',
          direction: 'backward',
          unit: event.unit,
          at: selection,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.forward',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      return {selection: snapshot.context.selection}
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'delete',
          direction: 'forward',
          unit: event.unit,
          at: selection,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.block',
    actions: [
      ({event}) => [
        raise({
          type: 'delete',
          at: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: 0,
            },
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.text',
    guard: ({snapshot, event}) => {
      const selection = utils.blockOffsetsToSelection({
        context: snapshot.context,
        offsets: event.at,
      })

      if (!selection) {
        return false
      }

      const trimmedSelection = selectors.getTrimmedSelection({
        beta: {
          activeAnnotations: [],
          activeDecorators: [],
        },
        context: {
          converters: [],
          schema: snapshot.context.schema,
          keyGenerator: snapshot.context.keyGenerator,
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
