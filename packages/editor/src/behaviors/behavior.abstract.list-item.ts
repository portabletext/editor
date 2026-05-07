import {getSelectedTextBlocks} from '../selectors/selector.get-selected-text-blocks'
import {isActiveListItem} from '../selectors/selector.is-active-list-item'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractListItemBehaviors = [
  defineBehavior({
    on: 'list item.add',
    guard: ({snapshot, event}) => {
      const selectedTextBlocks = getSelectedTextBlocks(snapshot).filter(
        (block) =>
          getPathSubSchema(snapshot, block.path).lists.some(
            (list) => list.name === event.listItem,
          ),
      )

      if (selectedTextBlocks.length === 0) {
        return false
      }

      return {selectedTextBlocks}
    },
    actions: [
      ({event}, {selectedTextBlocks}) =>
        selectedTextBlocks.map((block) =>
          raise({
            type: 'block.set',
            at: block.path,
            props: {
              level: block.node.level ?? 1,
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
