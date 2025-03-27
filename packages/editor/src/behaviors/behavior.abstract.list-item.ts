import {getSelectedTextBlocks, isActiveListItem} from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractListItemBehaviors = [
  defineBehavior({
    on: 'list item.add',
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
              level: 1,
              listItem: event.listItem,
            },
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'list item.remove',
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
            props: ['level', 'listItem'],
          }),
        ),
    ],
  }),
  defineBehavior({
    on: 'list item.toggle',
    guard: ({snapshot, event}) => isActiveListItem(event.listItem)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'list item.remove', listItem: event.listItem}),
      ],
    ],
  }),
  defineBehavior({
    on: 'list item.toggle',
    guard: ({snapshot, event}) => !isActiveListItem(event.listItem)(snapshot),
    actions: [
      ({event}) => [raise({type: 'list item.add', listItem: event.listItem})],
    ],
  }),
]
