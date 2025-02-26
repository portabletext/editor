import {defineConverterBehavior} from './behavior.converter.types'
import {raise} from './behavior.types'

export const converterBehaviorTextHtml = defineConverterBehavior({
  serialize: {
    guard: ({snapshot}) =>
      snapshot.context.converters.find(
        (converter) => converter.mimeType === 'text/html',
      ),
    actions: [
      ({snapshot, event}, converter) => [
        raise({
          ...converter.serialize({
            snapshot,
            event: {type: 'serialize', originEvent: event.originEvent},
          }),
          dataTransfer: event.dataTransfer,
        }),
      ],
    ],
  },
  deserialize: {
    guard: ({snapshot, event}) => {
      const converter = snapshot.context.converters.find(
        (converter) => converter.mimeType === 'text/html',
      )
      const data = event.dataTransfer.getData('text/html')

      if (converter && data) {
        return {converter, data}
      }

      return false
    },
    actions: [
      ({snapshot, event}, {converter, data}) => [
        raise({
          ...converter.deserialize({
            snapshot,
            event: {type: 'deserialize', data},
          }),
          dataTransfer: event.dataTransfer,
        }),
      ],
    ],
  },
})
