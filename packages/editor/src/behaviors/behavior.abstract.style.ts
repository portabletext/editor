import {getSelectedTextBlocks, isActiveStyle} from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractStyleBehaviors = [
  defineBehavior({
    on: 'style.add',
    guard: ({snapshot}) => {
      const selectedTextBlocks = getSelectedTextBlocks(snapshot)

      return {selectedTextBlocks}
    },
    actions: [
      ({event}, {selectedTextBlocks}) =>
        selectedTextBlocks.map((block) =>
          raise({
            type: 'block.set',
            at: block.path,
            props: {
              style: event.style,
            },
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'style.remove',
    guard: ({snapshot}) => {
      const selectedTextBlocks = getSelectedTextBlocks(snapshot)

      return {selectedTextBlocks}
    },
    actions: [
      (_, {selectedTextBlocks}) =>
        selectedTextBlocks.map((block) =>
          raise({
            type: 'block.unset',
            at: block.path,
            props: ['style'],
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'style.toggle',
    guard: ({snapshot, event}) => isActiveStyle(event.style)(snapshot),
    actions: [({event}) => [raise({type: 'style.remove', style: event.style})]],
  }),
  defineBehavior({
    on: 'style.toggle',
    guard: ({snapshot, event}) => !isActiveStyle(event.style)(snapshot),
    actions: [({event}) => [raise({type: 'style.add', style: event.style})]],
  }),
]
