import {isActiveAnnotation} from '../selectors'
import * as selectors from '../selectors'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.set',
    guard: ({snapshot, event}) => {
      const blockKey = event.at[0]._key
      const markDefKey = event.at[2]._key

      const block = selectors.getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: [{_key: blockKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}],
              offset: 0,
            },
          },
        },
      })

      if (!block) {
        return false
      }

      const updatedMarkDefs = block.node.markDefs?.map((markDef) => {
        if (markDef._key === markDefKey) {
          return {
            ...markDef,
            ...event.props,
          }
        }

        return markDef
      })

      return {blockKey, updatedMarkDefs}
    },
    actions: [
      (_, {blockKey, updatedMarkDefs}) => [
        raise({
          type: 'block.set',
          at: [{_key: blockKey}],
          props: {markDefs: updatedMarkDefs},
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) =>
      isActiveAnnotation(event.annotation.name)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'annotation.remove', annotation: event.annotation}),
      ],
    ],
  }),
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) =>
      !isActiveAnnotation(event.annotation.name)(snapshot),
    actions: [
      ({event}) => [
        raise({type: 'annotation.add', annotation: event.annotation}),
      ],
    ],
  }),
]
